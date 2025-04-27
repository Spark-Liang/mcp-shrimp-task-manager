import { Task } from "../types/index.js";

/**
 * 按照依赖关系对任务进行拓扑排序
 * 被依赖的任务将排在所有依赖它们的任务之前
 * 同时保证没有依赖关系的任务维持其原始相对顺序
 * 
 * @param tasks 待排序的任务列表
 * @returns 按依赖关系和原始顺序稳定排序后的任务列表
 */
export function sortTasksByDependencies(tasks: Task[]): Task[] {
  if (tasks.length === 0) {
    return [];
  }

  const taskMap = new Map<string, Task>();
  const originalIndexMap = new Map<string, number>();
  // 正向图： key 依赖 value (value 是 key 的前置依赖)
  const dependencyGraph = new Map<string, Set<string>>(); 
  // 反向图： key 被 value 依赖 (value 是 key 的后续任务)
  const dependentGraph = new Map<string, Set<string>>(); 
  const inDegree = new Map<string, number>();

  // 初始化
  tasks.forEach((task, index) => {
    taskMap.set(task.id, task);
    originalIndexMap.set(task.id, index);
    dependencyGraph.set(task.id, new Set());
    dependentGraph.set(task.id, new Set());
    inDegree.set(task.id, 0);
  });

  // 构建图和计算初始入度
  tasks.forEach(task => {
    if (task.dependencies && task.dependencies.length > 0) {
      task.dependencies.forEach(dep => {
        if (taskMap.has(dep.taskId)) {
          // task 依赖 dep.taskId
          dependencyGraph.get(task.id)!.add(dep.taskId);
          // dep.taskId 被 task 依赖
          dependentGraph.get(dep.taskId)!.add(task.id);
          // 增加 task 的入度 (因为它依赖别人)
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
        }
      });
    }
  });

  // Kahn算法改进版
  const sortedTasks: Task[] = [];
  const readyQueue: string[] = [];

  // 初始化就绪队列
  const initialReady: string[] = [];
  inDegree.forEach((degree, taskId) => {
    if (degree === 0) {
      initialReady.push(taskId);
    }
  });

  initialReady.sort((a, b) => (originalIndexMap.get(a) ?? Infinity) - (originalIndexMap.get(b) ?? Infinity));
  readyQueue.push(...initialReady);

  // 处理队列
  while (readyQueue.length > 0) {
    const currentId = readyQueue.shift()!;
    const currentTask = taskMap.get(currentId);
    if (currentTask) {
      sortedTasks.push(currentTask);
    }

    // 获取所有依赖当前任务的任务 (使用反向图)
    const dependents = dependentGraph.get(currentId) || new Set<string>();
    const newlyReady: string[] = [];

    for (const dependentId of dependents) {
      const newDegree = (inDegree.get(dependentId) || 0) - 1;
      if (newDegree >= 0) {
        inDegree.set(dependentId, newDegree);
        if (newDegree === 0) {
          newlyReady.push(dependentId);
        }
      } else {
        console.warn(`任务 ${dependentId} 的入度计算异常。`);
      }
    }

    // 按原始索引排序新就绪的任务，并加入队列
    newlyReady.sort((a, b) => (originalIndexMap.get(a) ?? Infinity) - (originalIndexMap.get(b) ?? Infinity));
    readyQueue.push(...newlyReady);
  }

  // 检查是否有环
  if (sortedTasks.length !== tasks.length) {
    console.warn("任务依赖中存在循环依赖，排序可能不完整。将尝试附加剩余任务...");
    // 将剩余的任务附加到末尾，尽可能保持原始顺序
    const sortedIds = new Set(sortedTasks.map(t => t.id));
    const remainingTasks: Task[] = [];
    tasks.forEach(task => {
      if (!sortedIds.has(task.id)) {
        remainingTasks.push(task);
      }
    });
    // 对剩余任务也尝试按原始顺序排序
    remainingTasks.sort((a, b) => (originalIndexMap.get(a.id) ?? Infinity) - (originalIndexMap.get(b.id) ?? Infinity));
    sortedTasks.push(...remainingTasks);
  }

  return sortedTasks;
}

/**
 * 检测任务依赖图中是否存在循环依赖
 * 
 * @param tasks 任务列表
 * @returns 是否存在循环依赖
 */
export function hasCyclicDependencies(tasks: Task[]): boolean {
  // 创建任务映射表
  const taskMap = new Map<string, Task>();
  tasks.forEach(task => {
    taskMap.set(task.id, task);
  });
  
  // 用于跟踪当前路径上的任务ID
  const visited = new Set<string>();
  // 用于跟踪已完成DFS的任务ID
  const completed = new Set<string>();
  
  /**
   * 使用深度优先搜索检测环
   * @param taskId 当前任务ID
   * @returns 是否检测到环
   */
  function dfs(taskId: string): boolean {
    if (completed.has(taskId)) {
      return false; // 已处理过此节点，无环
    }
    
    if (visited.has(taskId)) {
      return true; // 重复访问，检测到环
    }
    
    visited.add(taskId);
    
    const task = taskMap.get(taskId);
    if (task && task.dependencies) {
      for (const dep of task.dependencies) {
        // 只检查存在于 taskMap 中的依赖
        if (taskMap.has(dep.taskId) && dfs(dep.taskId)) {
          return true; // 在下游依赖中发现环
        }
      }
    }
    
    visited.delete(taskId);
    completed.add(taskId);
    return false;
  }
  
  // 对每个任务进行DFS
  for (const task of tasks) {
    if (!completed.has(task.id) && dfs(task.id)) {
      return true; // 发现循环依赖
    }
  }
  
  return false; // 未发现循环依赖
} 