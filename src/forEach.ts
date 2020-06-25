export type ForEachCallback<T, R> = (
  t: T | undefined,
  i: number | undefined,
  a: Array<T> | undefined,
) => Promise<R>;

export const forEachParallel = async <T, R>(array: Array<T>, callback: ForEachCallback<T, R>): Promise<Array<R>> => {
  const promises = Array<Promise<R>>();
  for (let index = 0; index < array.length; index++) {
    const promise = callback(array[index], index, array) as Promise<R>;
    promises.push(promise);
  }

  const results = await Promise.all(promises);
  return results;
};

export const forEachSynchronous = async <T, R>(array: Array<T>, callback: ForEachCallback<T, R>): Promise<Array<R>> => {
  const results = Array<R>();
  for (let index = 0; index < array.length; index++) {
    const result = await callback(array[index], index, array) as R;
    results.push(result);
  }

  return results;
};