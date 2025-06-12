export const validarEmail = (email: string) => {
  const emailRegex = /^[\w-.]+@[\w-]+\.[a-z]{2,}$/i;
  return emailRegex.test(email);
}; 