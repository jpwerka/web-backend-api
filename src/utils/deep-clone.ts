

type GenericObject = {
  [key: string]: unknown;
};

// Method that will return the data type for any structure passed to it
function getDataType(data: unknown): string {
  // Use the objects toString method on the data.
  // This will return something like [object String]
  // Then we use .slice to grab the last portion of it (in this case the "string" bit)
  return (Object.prototype.toString.call(data) as string).slice(8, -1);
}

// Create a method to detect whether an object contains a circular reference
function isCyclic(data: unknown) {

  // Create an array that will store the nodes of the array that have already been iterated over
  const seenObjects: unknown[] = [];

  function detect(data: unknown) {
    // If the data pass is an object
    if (data && getDataType(data) === "Object") {

      // If the data is already in the seen nodes array then we know there is a circular reference
      // Therefore return true
      if (seenObjects.indexOf(data) !== -1) {
        return true;
      }

      // Add the data to the seen objects array
      seenObjects.push(data);


      // Begin iterating through the data passed to the method
      for (const key in data as GenericObject) {
        // Recall this method with the objects key
        if (data.hasOwnProperty(key) === true && detect((data as GenericObject)[key])) {
          return true;
        }
      }
    }
    return false;
  }

  // Return the method
  return detect(data);
}

const deepClone = function (data: unknown): unknown {
  // If the data is null or undefined then we return undefined
  if (data === null || data === undefined) {
    return undefined;
  }

  // Get the data type and store it
  const dataType = getDataType(data);

  // If the data passed is a date object
  if (dataType === "Date") {
    // Create a new date object and set the time to what it was previously
    const clonedDate = new Date();
    clonedDate.setTime((data as Date).getTime());

    return clonedDate;
  }

  // If the data passed is an object
  if (dataType === "Object") {
    // Check for circular references, if there are then we just return the un-cloned data.
    if (isCyclic(data) === true) {
      return data;
    }

    // Create a new object that will store our copied data
    const copiedObject: GenericObject = {};

    // Iterate over the objects keys
    for (const key in data as GenericObject) {
      // Clone the keys of each of the objects so that we can deeply copy and nested data structures
      // For example if an object has a key value that is an array
      // Add this cloned key value to the copiedObject we created earlier
      copiedObject[key] = deepClone((data as GenericObject)[key]);
    }

    // Return the deeply copied object
    return copiedObject;
  }

  // If the data is an array
  if (dataType === "Array") {
    // Create a new array that will have no references to the one we want to copy
    const copiedArray = [];

    // Iterate over the arrays elements
    for (let i = 0; i < (data as Array<unknown>).length; i++) {
      // Push the arrays elements to this new array
      // First recall this method with the elements
      // This is so arrays of objects and other nested data structures get correctly cloned.
      copiedArray.push(deepClone((data as Array<unknown>)[i]));
    }

    // Return the cloned array
    return copiedArray;
  }

  // If it's any other data type like a string or number, they don't need cloning so we just return them
  else {
    return data;
  }
}

export function cloneDeep<T>(data: T): T {
  return deepClone(data) as T;
}
