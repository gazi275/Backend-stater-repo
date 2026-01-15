type PrismaFieldError = {
  field: string;
  type: "missing" | "invalid";
  message: string;
};

const handlePrismaValidation = (errorMessage: string) => {
  const errors: PrismaFieldError[] = [];

  // Missing argument errors
  const missingFieldRegex = /Argument `(.+?)` is missing\./g;
  let match: RegExpExecArray | null;

  while ((match = missingFieldRegex.exec(errorMessage)) !== null) {
    errors.push({
      field: match[1],
      type: "missing",
      message: `${match[1]} is required`,
    });
  }

  // Invalid value errors
  const invalidValueRegex =
    /Argument `(.+?)`: Invalid value provided. Expected (.+), provided (.+)\./g;

  while ((match = invalidValueRegex.exec(errorMessage)) !== null) {
    const field = match[1];
    const expected = match[2];
    const provided = match[3];

    errors.push({
      field,
      type: "invalid",
      message: `Expected ${expected}, but received ${provided}`,
    });
  }

  return {
    message: "Prisma validation failed",
    errors,
  };
};

export default handlePrismaValidation;
