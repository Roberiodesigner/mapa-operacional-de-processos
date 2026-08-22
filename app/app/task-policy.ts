export type TaskStatus = "not_started" | "in_progress" | "done" | "blocked";

export type OperationalTask = {
  id: string;
  mapId: string;
  parentId: string | null;
  title: string;
  type: string;
  status: TaskStatus;
  priority: string;
  assignee: string;
  due: string;
  progress: number;
  blockedReason: string;
};

export type TaskFilter = "open" | "today" | "overdue" | "blocked" | "done";

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function isOperationalTask(task: OperationalTask) {
  return !["conhecimento", "área", "area", "nota"].includes(normalized(task.type));
}

export function isAssignedTo(task: OperationalTask, user: { name: string; email: string }) {
  const assignee = normalized(task.assignee);
  if (!assignee) return false;
  const email = normalized(user.email);
  const name = normalized(user.name);
  const firstName = name.split(/\s+/)[0] || name;
  return assignee === email || assignee.includes(email) || assignee === name || assignee.includes(name) || (firstName.length > 2 && assignee.includes(firstName));
}

export function todayKey(date = new Date()) {
  const year = date.getFullYear(), month = String(date.getMonth() + 1).padStart(2, "0"), day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function taskMatchesFilter(task: OperationalTask, filter: TaskFilter, today = todayKey()) {
  if (filter === "done") return task.status === "done";
  if (filter === "blocked") return task.status === "blocked";
  if (filter === "today") return task.status !== "done" && task.due === today;
  if (filter === "overdue") return task.status !== "done" && Boolean(task.due) && task.due < today;
  return task.status !== "done";
}

export function tasksForUser<T extends OperationalTask>(tasks: T[], user: { name: string; email: string }) {
  return tasks.filter(task => isOperationalTask(task) && isAssignedTo(task, user));
}
