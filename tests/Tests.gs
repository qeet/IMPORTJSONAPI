var data1 = {
  "store": {
    "book": [
      {
        "category": "reference",
        "author": "Nigel Rees",
        "title": "Sayings of the Century",
        "price": 8.95
      },
      {
        "category": "fiction",
        "author": "Evelyn Waugh",
        "title": "Sword of Honour",
        "price": 12.99
      },
      {
        "category": "fiction",
        "author": "Herman Melville",
        "title": "Moby Dick",
        "isbn": "0-553-21311-3",
        "price": 8.99
      },
      {
        "category": "fiction",
        "author": "J. R. R. Tolkien",
        "title": "The Lord of the Rings",
        "isbn": "0-395-19395-8",
        "price": 22.99
      }
    ],
    "bicycle": {
      "color": "red",
      "price": 19.95
    }
  }
}

var data2 = {
  'food & cooking' : [
      {
      }
   ]
}

function compare_tables(expected, actual) {
  if (expected.length > actual.length) {
    return "Got less rows than expected"
  } else if (expected.length < actual.length) {
    return "Got more rows than expected"
  }
  for (var i=0; i<expected.length; i++) {
    var exp_row = expected[i]
    var act_row = actual[i]
    if (exp_row.length > act_row.length) {
      return "Got less cols than expected"
    } else if (exp_row.length < act_row.length) {
      return "Got more cols than expected"
    }
    for (var j=0; j<exp_row.length; j++) {
      if (exp_row[j] !== act_row[j]) {
        return "Unexpected result"
      }
    }
  }
}

function check(result) {
  if (result) {
    console.log("FAIL!!!! - " + result)
  } else {
    console.log("PASS")
  }
}

function run_tests() {
  tests1();
  tests2();
}

function tests1() {
  var expected = IMPORTJSONAPI(data1, "$.store.book[*].author", "@")
  var actual = [ [ 'Nigel Rees' ], [ 'Evelyn Waugh' ], [ 'Herman Melville' ], [ 'J. R. R. Tolkien' ] ]
  check(compare_tables(expected, actual));
  expected = IMPORTJSONAPI(data1, "$..author", "@")
  check(compare_tables(expected, actual));
  
  expected = IMPORTJSONAPI(data1, "$.store..price", "@")
  actual = [ [ 8.95 ], [ 12.99 ], [ 8.99 ], [ 22.99 ], [ 19.95 ] ]
  check(compare_tables(expected, actual));
  
  expected = IMPORTJSONAPI(data1, "$..book[2]", "title")
  actual = [ [ 'Moby Dick' ] ]
  check(compare_tables(expected, actual));
  
  expected = IMPORTJSONAPI(data1, "$..book[-1:]", "title")
  actual = [ [ 'The Lord of the Rings' ] ]
  check(compare_tables(expected, actual));
  expected = IMPORTJSONAPI(data1, "$..book[(@.length-1)]", "title")
  check(compare_tables(expected, actual));
  
  expected = IMPORTJSONAPI(data1, "$..book[0,1]", "title")
  actual = [ [ 'Sayings of the Century' ], ['Sword of Honour'] ]
  check(compare_tables(expected, actual));
  expected = IMPORTJSONAPI(data1, "$..book[:2]", "title")
  check(compare_tables(expected, actual));
  
  expected = IMPORTJSONAPI(data1, "$..book[?(@.isbn)]", "title")
  actual = [ ['Moby Dick'], [ 'The Lord of the Rings' ] ]
  check(compare_tables(expected, actual));
  
  expected = IMPORTJSONAPI(data1, "$..book[?(@.price<10)]", "title")
  actual = [ [ 'Sayings of the Century' ], ['Moby Dick'] ]
  check(compare_tables(expected, actual));
  
  expected = IMPORTJSONAPI(data1, "$..*[?(@property === 'price' && @ !== 8.95)]", "@")
  actual = [ [ 19.95 ], [ 12.99 ], [ 8.99 ], [ 22.99 ] ]
  check(compare_tables(expected, actual));
  
  expected = IMPORTJSONAPI(data1, "$.store.*~", "@")
  actual = [ [ 'book' ], [ 'bicycle' ] ]
  check(compare_tables(expected, actual));
  
  expected = IMPORTJSONAPI(data1, "$.store.book[?(@path !== \"$['store']['book'][0]\")]", "title")
  actual = [ [ 'Sword of Honour' ], [ 'Moby Dick' ], [ 'The Lord of the Rings' ] ]
  check(compare_tables(expected, actual));
  
  expected = IMPORTJSONAPI(data1, "$..book[?(@parent.bicycle && @parent.bicycle.color === \"red\")].category", "@")
  var actual = [ [ 'reference' ], [ 'fiction' ], [ 'fiction' ], [ 'fiction' ] ]
  check(compare_tables(expected, actual));
}

function tests2() {
  var expected = IMPORTJSONAPI(data1, "$.store.book[*]", "title, ~")
  var actual =  [ [ 'Sayings of the Century', '0' ], [ 'Sword of Honour', '1' ], [ 'Moby Dick', '2' ], [ 'The Lord of the Rings', '3' ] ]
  check(compare_tables(expected, actual));
  
  var expected = IMPORTJSONAPI(data1, "$", "store.book[0].category")
  var actual =  [ [ 'reference' ] ]
  check(compare_tables(expected, actual));
  
  var expected = IMPORTJSONAPI(data1, "$.store.book[2]", "price, ^.^.~, ^.^.bicycle.color, unprop.more")
  var actual =  [ [ 8.99, 'store', 'red', '' ] ]
  check(compare_tables(expected, actual));
}

function tests3() {
  var expected = IMPORTJSONAPI(data1, "$.store.book[*]", "$.store.bicycle.color")
  var actual =  [ [ 'red' ], [ 'red' ], [ 'red' ], [ 'red' ] ]
  check(compare_tables(expected, actual));
  
  var expected = IMPORTJSONAPI(data1, "$.store.book[*]", "store.$.bicycle.color")
  var actual = [ [ 'ERROR: $ can only be used at the beginning of the path' ] ]
  check(compare_tables(expected, actual));
  
  var expected = IMPORTJSONAPI(data1, "$.store.book[*]", "$.store.bicycle.~")
  var actual = [ [ 'bicycle' ], [ 'bicycle' ], [ 'bicycle' ], [ 'bicycle' ] ]
  check(compare_tables(expected, actual));
  
  var expected = IMPORTJSONAPI(data1, "$.store.book[*]", "$.store.~.bicycle")
  var actual = [ [ 'ERROR: ~ operator can only be used at the end of the path' ] ]
  check(compare_tables(expected, actual));
}

function test_a() {
  var data = IMPORTJSONAPI(data1, "city, isNBAFranchise")
  
  var data = IMPORTJSONAPI("http://data.nba.net/10s/prod/v1/2018/teams.json", "$.league.*[*]", "city, isNBAFranchise")
  Logger.log(data)
}

function test_b() {
  var data = IMPORTJSONAPI("https://financialmodelingprep.com/api/v3/company/historical-discounted-cash-flow/AAPL?period=quarter", "$.historicalDCF[?(@.date === '2014-09-27')]", "date, DCF, 'Stock Price'")
  Logger.log(data)
}

function test_c() {
  var data = IMPORTJSONAPI("https://api.graph.cool/simple/v1/swapi", "$..films[*]", "^^name, director", "method=post", "contentType=application/json", "payload={ 'query': '{ allPersons { name films { director } } }' }")
  Logger.log(data)
}

function test_d() {
  var data = IMPORTJSONAPI("http://countries.trevorblades.com/", "$.data.countries[*]", "name, languages[0].native", "method=post", "contentType=application/json", "payload={ 'query': '{ countries { emoji name languages { name native } } }' }")
  Logger.log(data)
}
