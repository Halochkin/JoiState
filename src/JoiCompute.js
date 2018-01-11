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
    this.stack = [{functionsRun:[], pathsCache: {}}];
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
    for (let funKy of Object.getOwnPropertyNames(this.functionsRegister))
      perFuncPreviousPathsCache[funKy] = this.stack[0].pathsCache;
    this.stack = JoiCompute.__compute(this.functionsRegister, this.maxStackSize, pathsCache, perFuncPreviousPathsCache, []);
    return JoiGraph.setInAll(newReducedState, this.stack[0].pathsCache);
  }

  /**
   *
   * @param functions
   * @param stackRemainderCount
   * @param pathsCache              immutable
   * @param perFuncOldPathsCache    immutable
   * @param stack
   * @returns {Object[]} all the pathsCache, the full stack.
   * @private
   */
  static __compute(functions, stackRemainderCount, pathsCache, perFuncOldPathsCache, stack) {
    stackRemainderCount = JoiCompute.checkStackCount(stackRemainderCount);

    let functionsRun = [];
    for (let funKy of Object.getOwnPropertyNames(functions)) {
      const funcObj = functions[funKy];

      let previousPathsCache = perFuncOldPathsCache[funKy];
      if (previousPathsCache === pathsCache)        //funcObj has been run on the exact same paths
        continue;

      const argValues = JoiCompute.getChangedArgumentsOrNullIfNoneHasChanged(funcObj.argsPaths, pathsCache, previousPathsCache);
      if (!argValues){        //none of the arguments have changed, we then update perFuncOldPathsCache and do nothing.
        perFuncOldPathsCache[funKy] = pathsCache;
        continue;
      }

      functionsRun.push(funcObj);
      let newComputedValue = funcObj.func.apply(null, argValues);

      perFuncOldPathsCache = Object.assign({}, perFuncOldPathsCache);
      perFuncOldPathsCache[funKy] = pathsCache;
      if (!funcObj.returnPath)
        continue;

      if (newComputedValue === pathsCache[funcObj.returnPath])
        continue;                                      
      pathsCache = Object.assign({}, pathsCache);
      pathsCache[funcObj.returnPath] = newComputedValue;
      const temporaryResult = [{functionsRun, pathsCache}].concat(stack);
      return JoiCompute.__compute(functions, stackRemainderCount, pathsCache, perFuncOldPathsCache, temporaryResult);
    }
    let finalResult = {functionsRun, pathsCache};
    return [finalResult];
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