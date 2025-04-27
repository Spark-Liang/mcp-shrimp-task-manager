import { describe, it, expect } from 'vitest';
import { sortTasksByDependencies, hasCyclicDependencies } from '../../src/utils/taskSorter';
import { Task, TaskStatus, TaskDependency } from '../../src/types';

// 创建模拟任务的辅助函数
function createMockTask(id: string, name: string, dependencies: string[] = []): Task {
  return {
    id,
    name,
    description: `测试任务 ${name}`,
    status: TaskStatus.PENDING, 
    createdAt: new Date(),
    updatedAt: new Date(),
    dependencies: dependencies.map(depId => ({ taskId: depId } as TaskDependency))
  };
}

describe('任务排序器测试', () => {
  // 测试简单的线性依赖关系
  it('应正确排序简单的线性依赖任务', () => {
    // 任务依赖关系: C -> B -> A (意味着A必须在B之前执行，B必须在C之前执行)
    const taskA = createMockTask('a', '任务A');
    const taskB = createMockTask('b', '任务B', ['a']);
    const taskC = createMockTask('c', '任务C', ['b']);
    
    // 组装为无序的任务列表
    const tasks = [taskC, taskA, taskB];
    
    // 排序后，A应该在B之前，B应该在C之前
    const sortedTasks = sortTasksByDependencies(tasks);
    
    // 获取每个任务在排序后的索引
    const indexA = sortedTasks.findIndex(t => t.id === 'a');
    const indexB = sortedTasks.findIndex(t => t.id === 'b');
    const indexC = sortedTasks.findIndex(t => t.id === 'c');
    
    // 验证排序顺序
    expect(indexA).toBeLessThan(indexB);
    expect(indexB).toBeLessThan(indexC);
  });
  
  // 测试复杂的依赖结构
  it('应正确排序复杂的依赖关系', () => {
    // 依赖结构:
    // A <- B
    // A <- C <- D
    // B <- D
    // 正确的排序可能是：A、[B,C的顺序无所谓]、D
    const taskA = createMockTask('a', '任务A');
    const taskB = createMockTask('b', '任务B', ['a']);
    const taskC = createMockTask('c', '任务C', ['a']);
    const taskD = createMockTask('d', '任务D', ['b', 'c']);
    
    const tasks = [taskD, taskC, taskB, taskA];
    
    const sortedTasks = sortTasksByDependencies(tasks);
    
    // 获取每个任务在排序后的索引
    const indexA = sortedTasks.findIndex(t => t.id === 'a');
    const indexB = sortedTasks.findIndex(t => t.id === 'b');
    const indexC = sortedTasks.findIndex(t => t.id === 'c');
    const indexD = sortedTasks.findIndex(t => t.id === 'd');
    
    // A应该在B、C之前
    expect(indexA).toBeLessThan(indexB);
    expect(indexA).toBeLessThan(indexC);
    
    // D应该在B、C之后
    expect(indexD).toBeGreaterThan(indexB);
    expect(indexD).toBeGreaterThan(indexC);
  });
  
  // 测试独立任务的处理
  it('应保持独立任务的位置', () => {
    // A和D是独立的，B依赖于C
    const taskA = createMockTask('a', '独立任务A');
    const taskB = createMockTask('b', '任务B', ['c']);
    const taskC = createMockTask('c', '任务C');
    const taskD = createMockTask('d', '独立任务D');
    
    const tasks = [taskA, taskB, taskC, taskD];
    
    const sortedTasks = sortTasksByDependencies(tasks);
    
    // 获取每个任务在排序后的索引
    const indexB = sortedTasks.findIndex(t => t.id === 'b');
    const indexC = sortedTasks.findIndex(t => t.id === 'c');
    
    // 只检查B必须在C之后
    expect(indexB).toBeGreaterThan(indexC);
    
    // 确保所有任务都在排序后的列表中
    expect(sortedTasks.length).toBe(4);
    expect(sortedTasks.map(t => t.id).sort()).toEqual(['a', 'b', 'c', 'd'].sort());
  });
  
  // 测试独立任务和依赖任务混合时的相对顺序
  it('应保持无依赖关系任务的相对顺序', () => {
    // A, D 独立; B 依赖 C
    // Input order: A, B, C, D
    const taskA = createMockTask('a', '独立任务A'); // index 0
    const taskB = createMockTask('b', '任务B', ['c']); // index 1, depends on C (idx 2)
    const taskC = createMockTask('c', '任务C'); // index 2
    const taskD = createMockTask('d', '独立任务D'); // index 3

    const tasks = [taskA, taskB, taskC, taskD];

    const sortedTasks = sortTasksByDependencies(tasks);

    // 预期顺序: A, C, D, B 
    // 分析:
    // 初始就绪 (入度0): A, C, D. 按原始索引排序: [A, C, D]
    // 队列: [A, C, D]
    // 1. 处理 A: sorted=[A]. 队列: [C, D]
    // 2. 处理 C: sorted=[A, C]. B 入度-1 -> 0. 新就绪=[B]. 按原始索引排序: [B]. 队列: [D, B]
    // 3. 处理 D: sorted=[A, C, D]. 队列: [B]
    // 4. 处理 B: sorted=[A, C, D, B]. 队列: []
    expect(sortedTasks.map(t => t.id)).toEqual(['a', 'c', 'd', 'b']);

    // 验证 A, C, D 之间的相对顺序 (都是初始就绪)
    const indexA = sortedTasks.findIndex(t => t.id === 'a');
    const indexC = sortedTasks.findIndex(t => t.id === 'c');
    const indexD = sortedTasks.findIndex(t => t.id === 'd');
    expect(indexA).toBeLessThan(indexC);
    expect(indexC).toBeLessThan(indexD);
    
    // 验证 B 依赖 C
    const indexB = sortedTasks.findIndex(t => t.id === 'b');
    expect(indexC).toBeLessThan(indexB);
  });

  // 新增测试：测试多个任务同时就绪的情况
  it('应优先处理原始顺序靠前的可执行任务', () => {
    // E 依赖 A, B; F 依赖 C, D
    // Input Order: A, B, C, D, E, F
    const taskA = createMockTask('a', '任务A'); // idx 0
    const taskB = createMockTask('b', '任务B'); // idx 1
    const taskC = createMockTask('c', '任务C'); // idx 2
    const taskD = createMockTask('d', '任务D'); // idx 3
    const taskE = createMockTask('e', '任务E', ['a', 'b']); // idx 4
    const taskF = createMockTask('f', '任务F', ['c', 'd']); // idx 5

    const tasks = [taskA, taskB, taskC, taskD, taskE, taskF];
    const sortedTasks = sortTasksByDependencies(tasks);

    // 预期: A, B, C, D, E, F
    // 分析:
    // 初始就绪: A, B, C, D. 按索引排序: [A, B, C, D]. 队列: [A, B, C, D]
    // 1. 处理 A: sorted=[A]. E 入度-1 -> 1. 队列: [B, C, D]
    // 2. 处理 B: sorted=[A, B]. E 入度-1 -> 0. 新就绪=[E]. 按索引排序:[E]. 队列: [C, D, E]
    // 3. 处理 C: sorted=[A, B, C]. F 入度-1 -> 1. 队列: [D, E]
    // 4. 处理 D: sorted=[A, B, C, D]. F 入度-1 -> 0. 新就绪=[F]. 按索引排序:[F]. 队列: [E, F]
    // 5. 处理 E: sorted=[A, B, C, D, E]. 队列: [F]
    // 6. 处理 F: sorted=[A, B, C, D, E, F]. 队列: []
    expect(sortedTasks.map(t => t.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  // 新增测试：测试纯独立任务列表
  it('应保持纯独立任务列表的原始顺序', () => {
    const taskA = createMockTask('a', '任务A'); // idx 0
    const taskB = createMockTask('b', '任务B'); // idx 1
    const taskC = createMockTask('c', '任务C'); // idx 2
    
    const tasks = [taskA, taskB, taskC];
    const sortedTasks = sortTasksByDependencies(tasks);
    expect(sortedTasks.map(t => t.id)).toEqual(['a', 'b', 'c']);

    // 测试反向顺序
    const tasksReverse = [taskC, taskB, taskA];
    const sortedTasksReverse = sortTasksByDependencies(tasksReverse);
    expect(sortedTasksReverse.map(t => t.id)).toEqual(['c', 'b', 'a']);
  });
  
  // 测试循环依赖的处理
  it('应处理循环依赖并提供最佳排序（附加剩余任务）', () => {
    // 创建循环依赖: A -> B -> C -> A
    const taskA = createMockTask('a', '任务A', ['c']);
    const taskB = createMockTask('b', '任务B', ['a']);
    const taskC = createMockTask('c', '任务C', ['b']);
    
    const tasks = [taskA, taskB, taskC];
    
    // 即使有循环依赖，算法也应该返回某种排序结果
    const sortedTasks = sortTasksByDependencies(tasks);
    
    // 确保所有任务都在结果中
    expect(sortedTasks.length).toBe(3);
    expect(sortedTasks.map(t => t.id).sort()).toEqual(['a', 'b', 'c'].sort());
  });

  // 测试循环依赖检测
  it('应正确检测循环依赖', () => {
    // 无循环依赖
    const taskA1 = createMockTask('a1', '任务A1');
    const taskB1 = createMockTask('b1', '任务B1', ['a1']);
    const taskC1 = createMockTask('c1', '任务C1', ['b1']);
    
    const tasksWithoutCycle = [taskA1, taskB1, taskC1];
    expect(hasCyclicDependencies(tasksWithoutCycle)).toBe(false);
    
    // 有循环依赖
    const taskA2 = createMockTask('a2', '任务A2', ['c2']);
    const taskB2 = createMockTask('b2', '任务B2', ['a2']);
    const taskC2 = createMockTask('c2', '任务C2', ['b2']);
    
    const tasksWithCycle = [taskA2, taskB2, taskC2];
    expect(hasCyclicDependencies(tasksWithCycle)).toBe(true);
  });
  
  // 测试空任务列表
  it('应正确处理空任务列表', () => {
    const tasks: Task[] = [];
    const sortedTasks = sortTasksByDependencies(tasks);
    
    expect(sortedTasks).toEqual([]);
  });
  
  // 测试含有无效依赖的任务
  it('应正确处理含有不存在依赖的任务', () => {
    // taskB依赖一个不存在的任务X
    const taskA = createMockTask('a', '任务A');
    const taskB = createMockTask('b', '任务B', ['x', 'a']);
    
    const tasks = [taskA, taskB];
    
    const sortedTasks = sortTasksByDependencies(tasks);
    
    // B仍然应该在A之后，因为B依赖A
    const indexA = sortedTasks.findIndex(t => t.id === 'a');
    const indexB = sortedTasks.findIndex(t => t.id === 'b');
    
    expect(indexA).toBeLessThan(indexB);
  });
}); 