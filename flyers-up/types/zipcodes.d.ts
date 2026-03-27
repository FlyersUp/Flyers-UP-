declare module 'zipcodes' {
  export function lookup(zip: string): { zip: string } | undefined;
  export function radius(zip: string, miles: number): string[];
}
