
/** adds specified delay (in ms) to both next and error channels of the response observable */
export function delayResponse<T>(response$: Promise<T>, delayMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    response$
      .then(value => setTimeout(() => resolve(value), delayMs))
      .catch(reason => setTimeout(() => reject(reason), delayMs));
  });
}
