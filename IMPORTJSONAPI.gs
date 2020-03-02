/*====================================================================================================================================*
  IMPORTJSONAPI 
  ====================================================================================================================================
  Version:      1.0.1
  Project Page: https://github.com/qeet/IMPORTJSONAPI
  License:      The MIT License (MIT)
  ------------------------------------------------------------------------------------------------------------------------------------
  
  Changelog:
  1.0.1  Fix returning empty results (2 March 2020)
  1.0.0  Initial release (23 February 2020)
 *====================================================================================================================================*/

 /**
 * Return data from a JSON API.
 *
 * @param {string} url The URL of the API endpoint.
 * @param {string} query The JSONPath query expression.
 * @param {string} columns A comma separated list of column path expressions.
 * @param {string} [param] An optional parameter.
 * @return A two-dimensional array containing the data.
 * @customfunction
 */
function IMPORTJSONAPI(url, query, cols) {
  try {
    
    if (!(typeof url === "object" || typeof url === "string")) {
      throw new Error("Parameter 1 must be a JSON object or URL")
    }
    
    if (typeof query !== "string" || query === "") {
      throw new Error("Parameter 2 must be a JSONPath query")
    }
    
    if (typeof cols === "string") {
      cols = cols.split(",")
      if (cols.length === 1 && cols[0] ==="") {
        throw new Error("Parameter 3 must specify at least 1 column")
      }
    } else {
      throw new Error("Parameter 3 must be a list of columns")
    }
    
    var params = {};
    for (var i=3; i<arguments.length; i++) {
        var arg = arguments[i];
        if (typeof arg === "string") {
          var name_value = parse_param_(arg)
          if (name_value) params[name_value[0]] = name_value[1];
        }
    }
   
    return do_import_(url, query, cols, params)
    
  } catch (e) {
    var msg = "ERROR: " + e.message
    return [ [ msg ] ]
  }
}

function do_import_(url, query, cols, params) {
  var json = url
  if (typeof url === "string") json = do_fetch_(url, params) 

  cols_code = []
  for (var i=0; i<cols.length; i++) {
    cols_code.push(compile_path_(cols[i]))
  }
  table_data = []
  JSONPath.JSONPath(query, json, function(val, _, details) {
    row_data = []
    for (var i = 0; i < cols_code.length; i++) {
      var path = JSONPath.JSONPath.toPathArray(details.path).slice()
      var data = exec_(cols_code[i], val, path, json)
      row_data.push(gs_literal_(data))
    }
    table_data.push(row_data)
  })
  
  if (table_data.length == 0) {
    table_data = null;
  }
  
  return table_data;
}

function do_fetch_(url, params) {
  if (params['contentType'] === "application/json" && typeof params['payload'] === 'object' ) {
     params['payload'] = JSON.stringify(params['payload'])
  }
  var response = UrlFetchApp.fetch(url, params)
  return JSON.parse(response.getContentText());
}

function gs_literal_(data) {
  if (data === undefined) {
    data = ""
  } else if (data === null) {
    data = ""
  } else if (Array.isArray(data)) {
    var s = ""
    for (var i=0; i<data.length; i++) {
      var d = data[i]
      if (Array.isArray(d) || (typeof d === "object" && d !== null)) {
        s = object_str_(data)
        break
      } else{
        s += gs_literal_(d)
        if (i != (data.length-1)) {
          s += ","
        }
      }
    }
    data = s
  } else if (typeof data === "object") {
    data = object_str_(data)
  }
  return data
}

function object_str_(obj) {
  var s = JSON.stringify(obj)
  if (s.length > 50) s = s.substring(0, 50) + "..."
  return s
}

function exec_(code, val, path, root) {
  for (var i=0; i < code.length; i++) {
    val = code[i].value(val, path, root);
    if (!val) break;
  }
  return val
}

function compile_path_(path) {
  var ops = []
  var tokens = tokenize_(path.trim())
  
  if (is_next_(tokens, "dollar")) {
    ops.push(new op_root_())
    tokens.shift()
  }
  
  while (tokens.length > 0) {
    var tok = tokens.shift()
    var type = tok[0]
    if (type == "dot" || type == "at") {
      continue;
    } else if (type == "caret") {
      ops.push(new op_up_())
    } else if (type == "tilde") {
      if (tokens.length > 0) {
        throw new Error("~ operator can only be used at the end of the path");
      }
      ops.push(new op_propname_())
    } else if (type == "string" || type == "identifier") {
      var s = decodeURIComponent(tok[1])  // Replace escaped commas
      ops.push(new op_down_(type == "string" ? s.slice(1, -1) : s))
    } else if (type == "obracket") {
      if (!is_next_(tokens, "int")) {
        throw new Error("array index must be an integer");
      }
      var idx = tokens.shift()[1]
      ops.push(new op_down_(parseInt(idx)))
      if (!is_next_(tokens, "cbracket")) {
        throw new Error("expected token ']'");
      }
      tokens.shift()
    } else if (type == "dollar") {
      throw new Error("$ can only be used at the beginning of the path");
    }
  }
  
  return ops
}

function op_root_() {
  this.value = function (val, path, root) {
    while (path.length > 1) {
      path.pop()
    }
    return root
  }
}

function op_up_() {
  this.value = function (val, path, root) {
    if (path.length > 1) {
      path.pop()
    }
    return resolve_(path, root)
  }
}

function op_down_(name) {
  this.value = function (val, path, root) {
    if (Array.isArray(val) || (typeof val === "object" && val !== null)) {
      path.push(name)
      return val[name]
    } else {
      return undefined
    }
  }
}

function op_propname_() {
  this.value = function (val, path, root) {
    if (path.length > 1) {
      return path[path.length-1]
    } else {
      return undefined
    }
  }
}

function resolve_(path, root) {
  var value = root
  for (i=1; i<path.length; i++) {
    value = value[path[i]]
  }
  return value
}

/*
 * Parameters parser
 */
 var param_types = {
  "method" : "string",
  "contentType" : "string",
  "headers" : 'object',
  "payload" : 'object'
}

function parse_param_(arg) {
  var n = arg.indexOf('=');
  if (n < 2) return;
  var name = arg.substr(0, n).trim()
  var value = arg.substr(n+1).trim()
  if (value.length == 0) return;
  value = decodeURIComponent(value) // Replace escaped '='  
  var type = param_types[name]

  if (type == 'string') {
    return [name, value]
  } else if (type == 'object') {
    value = value.replace(/'/g, '"')
    try {
      return [name, JSON.parse(value)]
    } catch (e) {
      throw new Error("Invalid JSON: " + value);
    }
  } else {
    throw new Error("Invalid parameter name: " + name);
  }
}

/*
 * Column path tokenizer
 */
var patterns = [
  ["tilde", /^\~/],
  ["caret", /^\^/],
  ["at", /^\@/],
  ["dollar", /^\$/],
  ["dot", /^\./],
  ["identifier", /^[a-zA-Z_]\w*/],
  ["int", /^-?\d+/],
  ["obracket", /^\[/],
  ["cbracket", /^\]/],
  ["string", /^(["'])((?:\\\1|(?:(?!\1)).)*)(\1)/]
];
  
function read_token_(input, i) {
  for (var j = 0; j < patterns.length; j++) {
    var regex = patterns[j][1];
    var result = input.slice(i).match(regex);
    if (result !== null) {
      var text = result[0];
      var token = [patterns[j][0], input.substring(i, i+text.length)];
      return [token, i + text.length];
    }
  }
  throw new Error("unexpected character in column path: '" + input.slice(i) + "'");
}

function tokenize_(input) {
  var tokens = [];
  for (var i = 0; i < input.length;) {
    var result = read_token_(input, i);
    var token = result[0];
    i = result[1];
    tokens.push(token);
  }
  return tokens;
}

function is_next_(tokens, ttype) {
  if (tokens.length > 0 && tokens[0][0] == ttype) {
    return true;
  } else {
    return false
  }
}

/*====================================================================================================================================*

  JSONPath query engine. Copied from:
  https://github.com/s3u/JSONPath

 *====================================================================================================================================*/

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.JSONPath = {}));
}(this, (function (exports) { 'use strict';

function _typeof(obj) {
  "@babel/helpers - typeof";
  
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function (obj) {
      return typeof obj;
    };
  } else {
    _typeof = function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }
  
  return _typeof(obj);
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }
  
  subClass.prototype = Object.create(superClass && superClass.prototype, {
                                     constructor: {
                                     value: subClass,
                                     writable: true,
                                     configurable: true
                                     }
                                     });
  if (superClass) _setPrototypeOf(subClass, superClass);
}

function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}

function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };
  
  return _setPrototypeOf(o, p);
}

function isNativeReflectConstruct() {
  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
  if (Reflect.construct.sham) return false;
  if (typeof Proxy === "function") return true;
  
  try {
    Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
    return true;
  } catch (e) {
    return false;
  }
}

function _construct(Parent, args, Class) {
  if (isNativeReflectConstruct()) {
    _construct = Reflect.construct;
  } else {
    _construct = function _construct(Parent, args, Class) {
      var a = [null];
      a.push.apply(a, args);
      var Constructor = Function.bind.apply(Parent, a);
      var instance = new Constructor();
      if (Class) _setPrototypeOf(instance, Class.prototype);
      return instance;
    };
  }
  
  return _construct.apply(null, arguments);
}

function _isNativeFunction(fn) {
  return Function.toString.call(fn).indexOf("[native code]") !== -1;
}

function _wrapNativeSuper(Class) {
  var _cache = typeof Map === "function" ? new Map() : undefined;
  
  _wrapNativeSuper = function _wrapNativeSuper(Class) {
    if (Class === null || !_isNativeFunction(Class)) return Class;
    
    if (typeof Class !== "function") {
      throw new TypeError("Super expression must either be null or a function");
    }
    
    if (typeof _cache !== "undefined") {
      if (_cache.has(Class)) return _cache.get(Class);
      
      _cache.set(Class, Wrapper);
    }
    
    function Wrapper() {
      return _construct(Class, arguments, _getPrototypeOf(this).constructor);
    }
    
    Wrapper.prototype = Object.create(Class.prototype, {
      constructor: {
        value: Wrapper,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    return _setPrototypeOf(Wrapper, Class);
  };
  
  return _wrapNativeSuper(Class);
}

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  
  return self;
}

function _possibleConstructorReturn(self, call) {
  if (call && (typeof call === "object" || typeof call === "function")) {
    return call;
  }
  
  return _assertThisInitialized(self);
}

function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
}

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];
    
    return arr2;
  }
}

function _iterableToArray(iter) {
  if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
}

function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance");
}

/* eslint-disable prefer-named-capture-group */
// Disabled `prefer-named-capture-group` due to https://github.com/babel/babel/issues/8951#issuecomment-508045524
// Only Node.JS has a process variable that is of [[Class]] process
var supportsNodeVM = function supportsNodeVM() {
  try {
    return Object.prototype.toString.call(global.process) === '[object process]';
  } catch (e) {
    return false;
  }
};

var hasOwnProp = Object.prototype.hasOwnProperty;
/**
* @typedef {null|boolean|number|string|PlainObject|GenericArray} JSONObject
*/

/**
* @callback ConditionCallback
* @param {any} item
* @returns {boolean}
*/

/**
* Copy items out of one array into another.
* @param {GenericArray} source Array with items to copy
* @param {GenericArray} target Array to which to copy
* @param {ConditionCallback} conditionCb Callback passed the current item;
*     will move item if evaluates to `true`
* @returns {void}
*/

var moveToAnotherArray = function moveToAnotherArray(source, target, conditionCb) {
  var il = source.length;
  
  for (var i = 0; i < il; i++) {
    var item = source[i];
    
    if (conditionCb(item)) {
      target.push(source.splice(i--, 1)[0]);
    }
  }
};

JSONPath.nodeVMSupported = supportsNodeVM();
var vm = JSONPath.nodeVMSupported ? require('vm') : {
  /**
  * @param {string} expr Expression to evaluate
  * @param {PlainObject} context Object whose items will be added
  *   to evaluation
  * @returns {any} Result of evaluated code
  */
  runInNewContext: function runInNewContext(expr, context) {
    var keys = Object.keys(context);
    var funcs = [];
    moveToAnotherArray(keys, funcs, function (key) {
      return typeof context[key] === 'function';
    });
    var values = keys.map(function (vr, i) {
      return context[vr];
    });
    var funcString = funcs.reduce(function (s, func) {
      var fString = context[func].toString();
      
      if (!/function/.test(fString)) {
        fString = 'function ' + fString;
      }
      
      return 'var ' + func + '=' + fString + ';' + s;
    }, '');
    expr = funcString + expr; // Mitigate http://perfectionkills.com/global-eval-what-are-the-options/#new_function
    
    if (!expr.match(/(["'])use strict\1/) && !keys.includes('arguments')) {
      expr = 'var arguments = undefined;' + expr;
    } // Remove last semi so `return` will be inserted before
    //  the previous one instead, allowing for the return
    //  of a bare ending expression
    
    
    expr = expr.replace(/;[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*$/, ''); // Insert `return`
    
    var lastStatementEnd = expr.lastIndexOf(';');
    var code = lastStatementEnd > -1 ? expr.slice(0, lastStatementEnd + 1) + ' return ' + expr.slice(lastStatementEnd + 1) : ' return ' + expr; // eslint-disable-next-line no-new-func
    
    return _construct(Function, _toConsumableArray(keys).concat([code])).apply(void 0, _toConsumableArray(values));
  }
};
/**
* Copies array and then pushes item into it.
* @param {GenericArray} arr Array to copy and into which to push
* @param {any} item Array item to add (to end)
* @returns {GenericArray} Copy of the original array
*/

function push(arr, item) {
  arr = arr.slice();
  arr.push(item);
  return arr;
}
/**
* Copies array and then unshifts item into it.
* @param {any} item Array item to add (to beginning)
* @param {GenericArray} arr Array to copy and into which to unshift
* @returns {GenericArray} Copy of the original array
*/


function unshift(item, arr) {
  arr = arr.slice();
  arr.unshift(item);
  return arr;
}
/**
* Caught when JSONPath is used without `new` but rethrown if with `new`
* @extends Error
*/


var NewError =
    /*#__PURE__*/
    function (_Error) {
      _inherits(NewError, _Error);
      
      /**
      * @param {any} value The evaluated scalar value
      */
      function NewError(value) {
        var _this;
        
        _classCallCheck(this, NewError);
        
        _this = _possibleConstructorReturn(this, _getPrototypeOf(NewError).call(this, 'JSONPath should not be called with "new" (it prevents return ' + 'of (unwrapped) scalar values)'));
        _this.avoidNew = true;
        _this.value = value;
        _this.name = 'NewError';
        return _this;
      }
      
      return NewError;
    }(_wrapNativeSuper(Error));
/**
* @typedef {PlainObject} ReturnObject
* @property {string} path
* @property {JSONObject} value
* @property {PlainObject|GenericArray} parent
* @property {string} parentProperty
*/

/**
* @callback JSONPathCallback
* @param {string|PlainObject} preferredOutput
* @param {"value"|"property"} type
* @param {ReturnObject} fullRetObj
* @returns {void}
*/

/**
* @callback OtherTypeCallback
* @param {JSONObject} val
* @param {string} path
* @param {PlainObject|GenericArray} parent
* @param {string} parentPropName
* @returns {boolean}
*/

/**
* @typedef {PlainObject} JSONPathOptions
* @property {JSON} json
* @property {string|string[]} path
* @property {"value"|"path"|"pointer"|"parent"|"parentProperty"|"all"}
*   [resultType="value"]
* @property {boolean} [flatten=false]
* @property {boolean} [wrap=true]
* @property {PlainObject} [sandbox={}]
* @property {boolean} [preventEval=false]
* @property {PlainObject|GenericArray|null} [parent=null]
* @property {string|null} [parentProperty=null]
* @property {JSONPathCallback} [callback]
* @property {OtherTypeCallback} [otherTypeCallback] Defaults to
*   function which throws on encountering `@other`
* @property {boolean} [autostart=true]
*/

/**
* @param {string|JSONPathOptions} opts If a string, will be treated as `expr`
* @param {string} [expr] JSON path to evaluate
* @param {JSON} [obj] JSON object to evaluate against
* @param {JSONPathCallback} [callback] Passed 3 arguments: 1) desired payload
*     per `resultType`, 2) `"value"|"property"`, 3) Full returned object with
*     all payloads
* @param {OtherTypeCallback} [otherTypeCallback] If `@other()` is at the end
*   of one's query, this will be invoked with the value of the item, its
*   path, its parent, and its parent's property name, and it should return
*   a boolean indicating whether the supplied value belongs to the "other"
*   type or not (or it may handle transformations and return `false`).
* @returns {JSONPath}
* @class
*/


function JSONPath(opts, expr, obj, callback, otherTypeCallback) {
  // eslint-disable-next-line no-restricted-syntax
  if (!(this instanceof JSONPath)) {
    try {
      return new JSONPath(opts, expr, obj, callback, otherTypeCallback);
    } catch (e) {
      if (!e.avoidNew) {
        throw e;
      }
      
      return e.value;
    }
  }
  
  if (typeof opts === 'string') {
    otherTypeCallback = callback;
    callback = obj;
    obj = expr;
    expr = opts;
    opts = null;
  }
  
  var optObj = opts && _typeof(opts) === 'object';
  opts = opts || {};
  this.json = opts.json || obj;
  this.path = opts.path || expr;
  this.resultType = opts.resultType && opts.resultType.toLowerCase() || 'value';
  this.flatten = opts.flatten || false;
  this.wrap = hasOwnProp.call(opts, 'wrap') ? opts.wrap : true;
  this.sandbox = opts.sandbox || {};
  this.preventEval = opts.preventEval || false;
  this.parent = opts.parent || null;
  this.parentProperty = opts.parentProperty || null;
  this.callback = opts.callback || callback || null;
  
  this.otherTypeCallback = opts.otherTypeCallback || otherTypeCallback || function () {
    throw new TypeError('You must supply an otherTypeCallback callback option ' + 'with the @other() operator.');
  };
  
  if (opts.autostart !== false) {
    var args = {
      path: optObj ? opts.path : expr
    };
    
    if (!optObj) {
      args.json = obj;
    } else if ('json' in opts) {
      args.json = opts.json;
    }
    
    var ret = this.evaluate(args);
    
    if (!ret || _typeof(ret) !== 'object') {
      throw new NewError(ret);
    }
    
    return ret;
  }
} // PUBLIC METHODS


JSONPath.prototype.evaluate = function (expr, json, callback, otherTypeCallback) {
  var that = this;
  var currParent = this.parent,
      currParentProperty = this.parentProperty;
  var flatten = this.flatten,
      wrap = this.wrap;
  this.currResultType = this.resultType;
  this.currPreventEval = this.preventEval;
  this.currSandbox = this.sandbox;
  callback = callback || this.callback;
  this.currOtherTypeCallback = otherTypeCallback || this.otherTypeCallback;
  json = json || this.json;
  expr = expr || this.path;
  
  if (expr && _typeof(expr) === 'object' && !Array.isArray(expr)) {
    if (!expr.path && expr.path !== '') {
      throw new TypeError('You must supply a "path" property when providing an object ' + 'argument to JSONPath.evaluate().');
    }
    
    if (!hasOwnProp.call(expr, 'json')) {
      throw new TypeError('You must supply a "json" property when providing an object ' + 'argument to JSONPath.evaluate().');
    }
    
    var _expr = expr;
    json = _expr.json;
    flatten = hasOwnProp.call(expr, 'flatten') ? expr.flatten : flatten;
    this.currResultType = hasOwnProp.call(expr, 'resultType') ? expr.resultType : this.currResultType;
    this.currSandbox = hasOwnProp.call(expr, 'sandbox') ? expr.sandbox : this.currSandbox;
    wrap = hasOwnProp.call(expr, 'wrap') ? expr.wrap : wrap;
    this.currPreventEval = hasOwnProp.call(expr, 'preventEval') ? expr.preventEval : this.currPreventEval;
    callback = hasOwnProp.call(expr, 'callback') ? expr.callback : callback;
    this.currOtherTypeCallback = hasOwnProp.call(expr, 'otherTypeCallback') ? expr.otherTypeCallback : this.currOtherTypeCallback;
    currParent = hasOwnProp.call(expr, 'parent') ? expr.parent : currParent;
    currParentProperty = hasOwnProp.call(expr, 'parentProperty') ? expr.parentProperty : currParentProperty;
    expr = expr.path;
  }
  
  currParent = currParent || null;
  currParentProperty = currParentProperty || null;
  
  if (Array.isArray(expr)) {
    expr = JSONPath.toPathString(expr);
  }
  
  if (!expr && expr !== '' || !json) {
    return undefined;
  }
  
  this._obj = json;
  var exprList = JSONPath.toPathArray(expr);
  
  if (exprList[0] === '$' && exprList.length > 1) {
    exprList.shift();
  }
  
  this._hasParentSelector = null;
  
  var result = this._trace(exprList, json, ['$'], currParent, currParentProperty, callback).filter(function (ea) {
    return ea && !ea.isParentSelector;
  });
  
  if (!result.length) {
    return wrap ? [] : undefined;
  }
  
  if (!wrap && result.length === 1 && !result[0].hasArrExpr) {
    return this._getPreferredOutput(result[0]);
  }
  
  return result.reduce(function (rslt, ea) {
    var valOrPath = that._getPreferredOutput(ea);
    
    if (flatten && Array.isArray(valOrPath)) {
      rslt = rslt.concat(valOrPath);
    } else {
      rslt.push(valOrPath);
    }
    
    return rslt;
  }, []);
}; // PRIVATE METHODS


JSONPath.prototype._getPreferredOutput = function (ea) {
  var resultType = this.currResultType;
  
  switch (resultType) {
    default:
      throw new TypeError('Unknown result type');
      
    case 'all':
      {
        var path = Array.isArray(ea.path) ? ea.path : JSONPath.toPathArray(ea.path);
        ea.pointer = JSONPath.toPointer(path);
        ea.path = typeof ea.path === 'string' ? ea.path : JSONPath.toPathString(ea.path);
        return ea;
      }
      
    case 'value':
    case 'parent':
    case 'parentProperty':
      return ea[resultType];
      
    case 'path':
      return JSONPath.toPathString(ea[resultType]);
      
    case 'pointer':
      return JSONPath.toPointer(ea.path);
  }
};

JSONPath.prototype._handleCallback = function (fullRetObj, callback, type) {
  if (callback) {
    var preferredOutput = this._getPreferredOutput(fullRetObj);
    
    fullRetObj.path = typeof fullRetObj.path === 'string' ? fullRetObj.path : JSONPath.toPathString(fullRetObj.path); // eslint-disable-next-line callback-return
    
    callback(preferredOutput, type, fullRetObj);
  }
};
/**
*
* @param {string} expr
* @param {JSONObject} val
* @param {string} path
* @param {PlainObject|GenericArray} parent
* @param {string} parentPropName
* @param {JSONPathCallback} callback
* @param {boolean} hasArrExpr
* @param {boolean} literalPriority
* @returns {ReturnObject|ReturnObject[]}
*/


JSONPath.prototype._trace = function (expr, val, path, parent, parentPropName, callback, hasArrExpr, literalPriority) {
  // No expr to follow? return path and value as the result of
  //  this trace branch
  var retObj;
  var that = this;
  
  if (!expr.length) {
    retObj = {
      path: path,
      value: val,
      parent: parent,
      parentProperty: parentPropName,
      hasArrExpr: hasArrExpr
    };
    
    this._handleCallback(retObj, callback, 'value');
    
    return retObj;
  }
  
  var loc = expr[0],
      x = expr.slice(1); // We need to gather the return value of recursive trace calls in order to
  // do the parent sel computation.
  
  var ret = [];
  /**
  *
  * @param {ReturnObject|ReturnObject[]} elems
  * @returns {void}
  */
  
  function addRet(elems) {
    if (Array.isArray(elems)) {
      // This was causing excessive stack size in Node (with or
      //  without Babel) against our performance test:
      //  `ret.push(...elems);`
      elems.forEach(function (t) {
        ret.push(t);
      });
    } else {
      ret.push(elems);
    }
  }
  
  if ((typeof loc !== 'string' || literalPriority) && val && hasOwnProp.call(val, loc)) {
    // simple case--directly follow property
    addRet(this._trace(x, val[loc], push(path, loc), val, loc, callback, hasArrExpr));
  } else if (loc === '*') {
    // all child properties
    this._walk(loc, x, val, path, parent, parentPropName, callback, function (m, l, _x, v, p, par, pr, cb) {
      addRet(that._trace(unshift(m, _x), v, p, par, pr, cb, true, true));
    });
  } else if (loc === '..') {
    // all descendent parent properties
    // Check remaining expression with val's immediate children
    addRet(this._trace(x, val, path, parent, parentPropName, callback, hasArrExpr));
    
    this._walk(loc, x, val, path, parent, parentPropName, callback, function (m, l, _x, v, p, par, pr, cb) {
      // We don't join m and x here because we only want parents,
      //   not scalar values
      if (_typeof(v[m]) === 'object') {
        // Keep going with recursive descent on val's
        //   object children
        addRet(that._trace(unshift(l, _x), v[m], push(p, m), v, m, cb, true));
      }
    }); // The parent sel computation is handled in the frame above using the
    // ancestor object of val
    
  } else if (loc === '^') {
    // This is not a final endpoint, so we do not invoke the callback here
    this._hasParentSelector = true;
    return {
      path: path.slice(0, -1),
      expr: x,
      isParentSelector: true
    };
  } else if (loc === '~') {
    // property name
    retObj = {
      path: push(path, loc),
      value: parentPropName,
      parent: parent,
      parentProperty: null
    };
    
    this._handleCallback(retObj, callback, 'property');
    
    return retObj;
  } else if (loc === '$') {
    // root only
    addRet(this._trace(x, val, path, null, null, callback, hasArrExpr));
  } else if (/^(\x2D?[0-9]*):(\x2D?[0-9]*):?([0-9]*)$/.test(loc)) {
    // [start:end:step]  Python slice syntax
    addRet(this._slice(loc, x, val, path, parent, parentPropName, callback));
  } else if (loc.indexOf('?(') === 0) {
    // [?(expr)] (filtering)
    if (this.currPreventEval) {
      throw new Error('Eval [?(expr)] prevented in JSONPath expression.');
    }
    
    this._walk(loc, x, val, path, parent, parentPropName, callback, function (m, l, _x, v, p, par, pr, cb) {
      if (that._eval(l.replace(/^\?\(((?:[\0-\t\x0B\f\x0E-\u2027\u202A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*?)\)$/, '$1'), v[m], m, p, par, pr)) {
        addRet(that._trace(unshift(m, _x), v, p, par, pr, cb, true));
      }
    });
  } else if (loc[0] === '(') {
    // [(expr)] (dynamic property/index)
    if (this.currPreventEval) {
      throw new Error('Eval [(expr)] prevented in JSONPath expression.');
    } // As this will resolve to a property name (but we don't know it
    //  yet), property and parent information is relative to the
    //  parent of the property to which this expression will resolve
    
    
    addRet(this._trace(unshift(this._eval(loc, val, path[path.length - 1], path.slice(0, -1), parent, parentPropName), x), val, path, parent, parentPropName, callback, hasArrExpr));
  } else if (loc[0] === '@') {
    // value type: @boolean(), etc.
    var addType = false;
    var valueType = loc.slice(1, -2);
    
    switch (valueType) {
        /* istanbul ignore next */
      default:
        throw new TypeError('Unknown value type ' + valueType);
        
      case 'scalar':
        if (!val || !['object', 'function'].includes(_typeof(val))) {
          addType = true;
        }
        
        break;
        
      case 'boolean':
      case 'string':
      case 'undefined':
      case 'function':
        // eslint-disable-next-line valid-typeof
        if (_typeof(val) === valueType) {
          addType = true;
        }
        
        break;
        
      case 'number':
        // eslint-disable-next-line valid-typeof
        if (_typeof(val) === valueType && isFinite(val)) {
          addType = true;
        }
        
        break;
        
      case 'nonFinite':
        if (typeof val === 'number' && !isFinite(val)) {
          addType = true;
        }
        
        break;
        
      case 'object':
        // eslint-disable-next-line valid-typeof
        if (val && _typeof(val) === valueType) {
          addType = true;
        }
        
        break;
        
      case 'array':
        if (Array.isArray(val)) {
          addType = true;
        }
        
        break;
        
      case 'other':
        addType = this.currOtherTypeCallback(val, path, parent, parentPropName);
        break;
        
      case 'integer':
        if (val === Number(val) && isFinite(val) && !(val % 1)) {
          addType = true;
        }
        
        break;
        
      case 'null':
        if (val === null) {
          addType = true;
        }
        
        break;
    }
    
    if (addType) {
      retObj = {
        path: path,
        value: val,
        parent: parent,
        parentProperty: parentPropName
      };
      
      this._handleCallback(retObj, callback, 'value');
      
      return retObj;
    } // `-escaped property
    
  } else if (loc[0] === '`' && val && hasOwnProp.call(val, loc.slice(1))) {
    var locProp = loc.slice(1);
    addRet(this._trace(x, val[locProp], push(path, locProp), val, locProp, callback, hasArrExpr, true));
  } else if (loc.includes(',')) {
    // [name1,name2,...]
    var parts = loc.split(',');
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;
    
    try {
      for (var _iterator = parts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var part = _step.value;
        addRet(this._trace(unshift(part, x), val, path, parent, parentPropName, callback, true));
      } // simple case--directly follow property
      
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator["return"] != null) {
          _iterator["return"]();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  } else if (!literalPriority && val && hasOwnProp.call(val, loc)) {
    addRet(this._trace(x, val[loc], push(path, loc), val, loc, callback, hasArrExpr, true));
  } // We check the resulting values for parent selections. For parent
  // selections we discard the value object and continue the trace with the
  // current val object
  
  
  if (this._hasParentSelector) {
    for (var t = 0; t < ret.length; t++) {
      var rett = ret[t];
      
      if (rett && rett.isParentSelector) {
        var tmp = that._trace(rett.expr, val, rett.path, parent, parentPropName, callback, hasArrExpr);
        
        if (Array.isArray(tmp)) {
          ret[t] = tmp[0];
          var tl = tmp.length;
          
          for (var tt = 1; tt < tl; tt++) {
            t++;
            ret.splice(t, 0, tmp[tt]);
          }
        } else {
          ret[t] = tmp;
        }
      }
    }
  }
  
  return ret;
};

JSONPath.prototype._walk = function (loc, expr, val, path, parent, parentPropName, callback, f) {
  if (Array.isArray(val)) {
    var n = val.length;
    
    for (var i = 0; i < n; i++) {
      f(i, loc, expr, val, path, parent, parentPropName, callback);
    }
  } else if (val && _typeof(val) === 'object') {
    Object.keys(val).forEach(function (m) {
      f(m, loc, expr, val, path, parent, parentPropName, callback);
    });
  }
};

JSONPath.prototype._slice = function (loc, expr, val, path, parent, parentPropName, callback) {
  if (!Array.isArray(val)) {
    return undefined;
  }
  
  var len = val.length,
      parts = loc.split(':'),
      step = parts[2] && parseInt(parts[2]) || 1;
  var start = parts[0] && parseInt(parts[0]) || 0,
    end = parts[1] && parseInt(parts[1]) || len;
  start = start < 0 ? Math.max(0, start + len) : Math.min(len, start);
  end = end < 0 ? Math.max(0, end + len) : Math.min(len, end);
  var ret = [];
  
  for (var i = start; i < end; i += step) {
    var tmp = this._trace(unshift(i, expr), val, path, parent, parentPropName, callback, true); // Should only be possible to be an array here since first part of
    //   ``unshift(i, expr)` passed in above would not be empty, nor `~`,
    //     nor begin with `@` (as could return objects)
    // This was causing excessive stack size in Node (with or
    //  without Babel) against our performance test: `ret.push(...tmp);`
    
    
    tmp.forEach(function (t) {
      ret.push(t);
    });
  }
  
  return ret;
};

JSONPath.prototype._eval = function (code, _v, _vname, path, parent, parentPropName) {
  if (!this._obj || !_v) {
    return false;
  }
  
  if (code.includes('@parentProperty')) {
    this.currSandbox._$_parentProperty = parentPropName;
    code = code.replace(/@parentProperty/g, '_$_parentProperty');
  }
  
  if (code.includes('@parent')) {
    this.currSandbox._$_parent = parent;
    code = code.replace(/@parent/g, '_$_parent');
  }
  
  if (code.includes('@property')) {
    this.currSandbox._$_property = _vname;
    code = code.replace(/@property/g, '_$_property');
  }
  
  if (code.includes('@path')) {
    this.currSandbox._$_path = JSONPath.toPathString(path.concat([_vname]));
    code = code.replace(/@path/g, '_$_path');
  }
  
  if (code.includes('@root')) {
    this.currSandbox._$_root = this.json;
    code = code.replace(/@root/g, '_$_root');
  }
  
  if (code.match(/@([\t-\r \)\.\[\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF])/)) {
    this.currSandbox._$_v = _v;
    code = code.replace(/@([\t-\r \)\.\[\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF])/g, '_$_v$1');
  }
  
  try {
    return vm.runInNewContext(code, this.currSandbox);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
    throw new Error('jsonPath: ' + e.message + ': ' + code);
  }
}; // PUBLIC CLASS PROPERTIES AND METHODS
// Could store the cache object itself


JSONPath.cache = {};
/**
* @param {string[]} pathArr Array to convert
* @returns {string} The path string
*/

JSONPath.toPathString = function (pathArr) {
  var x = pathArr,
      n = x.length;
  var p = '$';
  
  for (var i = 1; i < n; i++) {
    if (!/^(~|\^|@(?:[\0-\t\x0B\f\x0E-\u2027\u202A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*?\(\))$/.test(x[i])) {
      p += /^[\*0-9]+$/.test(x[i]) ? '[' + x[i] + ']' : "['" + x[i] + "']";
    }
  }
  
  return p;
};
/**
* @param {string} pointer JSON Path
* @returns {string} JSON Pointer
*/


JSONPath.toPointer = function (pointer) {
  var x = pointer,
      n = x.length;
  var p = '';
  
  for (var i = 1; i < n; i++) {
    if (!/^(~|\^|@(?:[\0-\t\x0B\f\x0E-\u2027\u202A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*?\(\))$/.test(x[i])) {
      p += '/' + x[i].toString().replace(/~/g, '~0').replace(/\//g, '~1');
    }
  }
  
  return p;
};
/**
* @param {string} expr Expression to convert
* @returns {string[]}
*/


JSONPath.toPathArray = function (expr) {
  var cache = JSONPath.cache;
  
  if (cache[expr]) {
    return cache[expr].concat();
  }
  
  var subx = [];
  var normalized = expr // Properties
  .replace(/@(?:null|boolean|number|string|integer|undefined|nonFinite|scalar|array|object|function|other)\(\)/g, ';$&;') // Parenthetical evaluations (filtering and otherwise), directly
  //   within brackets or single quotes
  .replace(/['\[](\??\((?:[\0-\t\x0B\f\x0E-\u2027\u202A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*?\))['\]]/g, function ($0, $1) {
    return '[#' + (subx.push($1) - 1) + ']';
  }) // Escape periods and tildes within properties
  .replace(/\['((?:[\0-&\(-\\\^-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)'\]/g, function ($0, prop) {
    return "['" + prop.replace(/\./g, '%@%').replace(/~/g, '%%@@%%') + "']";
  }) // Properties operator
  .replace(/~/g, ';~;') // Split by property boundaries
  .replace(/'?\.'?(?!(?:[\0-Z\\-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*\])|\['?/g, ';') // Reinsert periods within properties
  .replace(/%@%/g, '.') // Reinsert tildes within properties
  .replace(/%%@@%%/g, '~') // Parent
  .replace(/(?:;)?(\^+)(?:;)?/g, function ($0, ups) {
    return ';' + ups.split('').join(';') + ';';
  }) // Descendents
  .replace(/;;;|;;/g, ';..;') // Remove trailing
  .replace(/;$|'?\]|'$/g, '');
  var exprList = normalized.split(';').map(function (exp) {
    var match = exp.match(/#([0-9]+)/);
    return !match || !match[1] ? exp : subx[match[1]];
  });
  cache[expr] = exprList;
  return cache[expr];
};

exports.JSONPath = JSONPath;

Object.defineProperty(exports, '__esModule', { value: true });

})));

if (typeof exports !== "undefined") {
  exports.IMPORTJSONAPI = IMPORTJSONAPI
}
