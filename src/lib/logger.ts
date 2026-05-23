export const logger = {
  error: (message: string, ...args: unknown[]) => console.error(message, ...args),
  warn: (message: string, ...args: unknown[]) => console.warn(message, ...args),
  info: (message: string, ...args: unknown[]) => console.info(message, ...args),
  debug: (message: string, ...args: unknown[]) => console.debug(message, ...args),
};
