declare module "json.date-extensions";

interface JSON {
  dateParser: (key: string, value: unknown) => unknown;
}

