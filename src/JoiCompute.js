/**
 * The JoiCompute is a virtual machine for both computing and/or observing functions.
 * Both compute and observe functions should only run when the values of the argument paths that they
 * are bound to changes.
 *
 * The state manager, such as JoiState, should use a separate JoiCompute for observers and computers.
 * By keeping the observers in a separate container, the state manager can assure that the observers are only run once,
 * after all the computed properties have updated. If not, an observer that listens for two or more computed properties
 * could be called once or twice during each cycle, depending only on the sequence of adding the compute and observe
 * functions, as it would be trigger after one computed parameter changes, or two computed parameters changes.
 */
class JoiCompute {

  constructor(maxStackSize) {
    this.maxStackSize = maxStackSize || 100;
    this.functionsRegister = {};
    this.pathRegister = {};
    this.stack = [{}];
  }

  bind(func, pathsAsStrings, returnName) {
    pathsAsStrings.map(path => this.pathRegister[path] = undefined);
    if (returnName)
      this.pathRegister[returnName] = undefined;

    let funKy = returnName + " = " + func.name + "(" + pathsAsStrings.join(", ") + ")";
    this.functionsRegister[funKy] = {
      func: func,
      funcName: func.name,
      argsPaths: pathsAsStrings,
      returnPath: returnName
    };
    // a function below could be put in place sorting so that the functions with the most computed arguments are put last.
    // this.functionsRegister = JoiCompute.sortFunctionsRegister(this.functionsRegister);
  }

  /**
   * this.stack[0] is the values of the last run. By checking the values from the last update,
   * compute and observe functions with no paramaters changed since last reducer call are not run.
   * This makes more sense for the developers writing reduce, compute and observe functions.
   *
   * @param newReducedState
   * @returns {Object} newly computed state
   */
  update(newReducedState) {
    let pathsCache = JoiGraph.getInAll(newReducedState, this.pathRegister);
    let perFuncPreviousPathsCache = {};
    for (let funKy in this.functionsRegister)
      perFuncPreviousPathsCache[funKy] = this.stack[0];
    this.stack = JoiCompute.__compute(this.functionsRegister, this.maxStackSize, pathsCache, perFuncPreviousPathsCache);
    return JoiGraph.setInAll(newReducedState, this.stack[0]);
  }

  //pathsCache is an immutable structure passed into __compute stack
  /**
   *
   * @param functions
   * @param stackRemainderCount
   * @param pathsCache
   * @param perFuncOldPathsCache
   * @returns {*}
   * @private
   */
  static __compute(functions, stackRemainderCount, pathsCache, perFuncOldPathsCache) {
    stackRemainderCount = JoiCompute.checkStackCount(stackRemainderCount);

    for (let funcKey in functions) {
      const funcObj = functions[funcKey];

      let previousPathsCache = perFuncOldPathsCache[funcKey];
      if (previousPathsCache === pathsCache)        //funcObj has been run on the exact same paths
        continue;

      const argValues = JoiCompute.getChangedArgumentsOrNullIfNoneHasChanged(funcObj.argsPaths, pathsCache, previousPathsCache)
      if (!argValues){                            //none of the arguments have changed, then we do nothing.
        perFuncOldPathsCache[funcKey] = pathsCache;
        continue;
      }

      let newComputedValue = funcObj.func.apply(null, argValues);

      perFuncOldPathsCache = Object.assign({}, perFuncOldPathsCache);
      perFuncOldPathsCache[funcKey] = pathsCache;
      if (!funcObj.returnPath)
        continue;

      if (newComputedValue === pathsCache[funcObj.returnPath])
        continue;                                      
      pathsCache = Object.assign({}, pathsCache);
      pathsCache[funcObj.returnPath] = newComputedValue;
      return JoiCompute.__compute(functions, stackRemainderCount, pathsCache, perFuncOldPathsCache).concat([pathsCache]);
    }
    return [pathsCache];
  }

  static getChangedArgumentsOrNullIfNoneHasChanged(argsPaths, pathToValueNow, pathToValueBefore) {
    let res = [], changed = false;
    for (let path of argsPaths) {
      if (pathToValueNow[path] !== pathToValueBefore[path])
        changed = true;
      res.push(pathToValueNow[path]);
    }
    return changed ? res: null;
  }

  static checkStackCount(stackRemainderCount) {
    if (stackRemainderCount >= 0)
      return stackRemainderCount - 1;
    throw new Error(
      "StackOverFlowError in JoiCompute (JoiState). Probably an infinite loop.\n " +
      "Tip: Even if it is not an infinite loop, you should still simplify your compute structure.");
  }
}