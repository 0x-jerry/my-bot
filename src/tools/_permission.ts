import path from 'node:path'

/**
 * Throw error if not allowed
 */
export function checkPathPermission(pathToCheck: string, root: string): string {
  const finalPath = path.isAbsolute(pathToCheck)
    ? pathToCheck
    : path.join(root, pathToCheck)

  if (path.relative(pathToCheck, root).startsWith('..')) {
    throw new Error(`Path not allow to access: ${pathToCheck}`)
  }

  return finalPath
}
