import { gv } from "../global";

export async function copyTodos(fromSessionId: string, toSessionId: string) {
  const todos = await gv.db.sessionTodo.findMany({
    where: {
      sessionId: fromSessionId,
    },
  });

  const result = await gv.db.sessionTodo.createMany({
    data: todos.map((todo) => ({
      sessionId: toSessionId,
      content: todo.content,
      status: todo.status,
    })),
  });

  return result;
}
