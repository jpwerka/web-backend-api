declare module "json.date-extensions";
declare module "clonedeep";

interface JSON {
  dateParser: (key: string, value: unknown) => unknown;
}

