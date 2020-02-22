# IMPORTJSONAPI

Provides a custom function to selectively extract data from a JSON or GraphQL API in a tabular format suitable for import into a Google Sheets spreadsheet.

## Changelog
- v1.0.0 - Initial release (23 February 2020)

## Installation

**NOTE: THIS SCRIPT REQUIRES THE NEW V8 RUNTIME - SEE STEP 3**

To add this custom function to your spreadsheet, follow this procedure:

1. Open the spreadsheet in your browser.
2. Select the `Tools > Script editor` menu option. This will open a script editor window. You will need to copy and paste the function code into a blank script file.
3. IMPORTANT - This script conatins functionality that requires the V8 runtime in order to work. To enable this select the `Run > Enable new Apps Script runtime powered by Chrome V8` option.
3. Copy the entire contents of the IMPORTJSONAPI.gs file. The raw file can found [here](https://raw.githubusercontent.com/qeet/IMPORTJSONAPI/master/IMPORTJSONAPI.gs). 
4. Paste this into the blank Code.gs script file or another blank script file that you have created.
5. Select the `File > Save` menu option to save the script.
6. You should now be able to use the `=IMPORTJSONAPI()` function in your sheet.

## Usage

    =IMPORTJSONAPI(URL, JSONPath Query, Columns [,Parameter] [,Parameter])

### Examples
The following examples are based on this JSON data:

```json
{
  "stores" : {
    "Borders" : [
      {
        "Title" : "Yellow Rivers",
        "Author" : "I.P. Daily",
        "Price" : 3.99
      },
      {
        "Title" : "Full Moon",
        "Author" : "Seymour Buns",
        "Price" : 6.49
      }
    ],
    "Waterstones" : [
      {
        "Title" : "Hot Dog",
        "Author" : "Frank Furter",
        "Price" : 8.50 
      }
    ]
  }
}
```

**Get titles of all books**

    =IMPORTJSONAPI("https://test.com/api", "$..Title", "@")
 
| Title         |
|---------------|
| Yellow Rivers |
| Full Moon     |
| Hot Dog       |

**Get all books and authors**

    =IMPORTJSONAPI("https://test.com/api", "$.stores.*[*]", "Title, Author")
    
| Title         | Author       |
|---------------|--------------|
| Yellow Rivers | I.P. Daily   |
| Full Moon     | Seymour Buns |
| Hot Dog       | Frank Furter |

**Select all books in all stores**

    =IMPORTJSONAPI("https://test.com/api", "$.stores.*[*]", "^.~, Title")

| Store Name  | Title         |
|-------------|---------------|
| Borders     | Yellow Rivers |
| Borders     | Full Moon     |
| Waterstones | Hot Dog       |

**The titles of all books with a price greater than 5**

    = IMPORTJSONAPI("https://test.com/api", "$..[?(@.Price>5)]", "Title")

| Title         |
|---------------|
| Full Moon     |
| Hot Dog       |

## Function Arguments
| Parameter          |  Description                                                                      |
|--------------------|-----------------------------------------------------------------------------------|
| **URL**            | The URL endpoint of the API                                                       |
| **JSONPath Query** | JSONPath query expression                                                         |
| **Columns**        | Comma separarted list of column path expressions                                  |
| **Parameter**      | Optional list of parameters                                                       |

### URL
The URL of the API endpoint. Any query parameters containing characters such as '&' or '=' should be urlencoded. For example:

    =IMPORTJSONAPI("https://api.test.com/store?api_token=ds45%3F6hjkd%3Ddjs, ...)

### JSONPath Query
The JSONPath expression to select the data that you wish to extract. Each JSON object matched by the expression will become a row in your spreadsheet. An introduction to JSONPath expressions can be found at <http://goessner.net/articles/JsonPath/>.

The actual JSONPath query implementation used is [JSONPath Plus](https://github.com/s3u/JSONPath) which contains some additional functionality and [examples](https://github.com/s3u/JSONPath#syntax-through-examples).

### Columns

The Columns parameter is a comma separated list of path expressions. Path expressions contain one or more of the following components optionally separated by a period.

| Component     |  Description                                                                      |
|---------------|-----------------------------------------------------------------------------------|
| **keyname**   | Specifies the key to a value. Must be quoted if it contains characters other than letters, numbers or the underscore character. if the name contains a comma ',' then it must always be escaped by using %2C instead. |       
| **[index]**   | Access an array with the specified index.                                         |
| **@**         | The current value.                                                                |
| **^**         | The parent of the current value.                                                  |
| **~**         | The key name of the current value. This must always appear last in the path.      |
| **$**         | The root of the JSON object. This must always appear first in the path.           |

If the value returned from the path expression is an array of scalars then the result is a list of the array items delimited by a comma.

If the value returned from the path expression is an object or an array which does not contain only scalars the result is the first 50 characters of the objects string representation.

### Column path expression examples

All examples are based on the following JSON Object:

```json
{
  "book" : {
    "title": "It",
    "author": "S. King",
    "orders" : [28, 72]
  }
}
```
The `Value` column is the result of the JSONPath expression and the `Result` column is the result after the column path expressions have been applied to the value. 

| JSONPath      | Value                                                       | Columns       | Result         |
|---------------|-------------------------------------------------------------|---------------|----------------|
| $.book        | { "title": "It", "author": "S. King", "orders" : [28, 72] } | title, author | "It", "S.King" |
| $.book.title  | "It"                                                        | @             | "It"           |
| $.book.orders | [28, 72]                                                    | @, [1]        | "28, 72", "72" | 
| $.book.orders | [28, 72]                                                    | ^.author      | "S.King"       |
| $.book        | { "title": "It", "author": "S. King", "orders" : [28, 72] } | ~             | "book"         | 
| $.book.orders | [28, 72]                                                    | ^~, [0]       | "book", "28"   |
| $.book.title  | "It"                                                        | $.book.author | "S. King"      |

### Parameters
After the three mandatory function arguments you can specify a variable number of function parameters. Each parameter is of the format:

    "parametername = value"

If the value contains a equals '=' character then it needs to be replaced with '%3D'. The value does not need to be quoted even if it is a string.

| Parameter name | Type   | Description                                                                            |
|----------------|--------|----------------------------------------------------------------------------------------|
| method         | String | The HTTP method for the request: get, delete, patch, post, or put. The default is get. |
| headers        | Object | A JSON key/value map of HTTP headers for the request.                                  |
| contentType    | String | The content type for post requests. The default is 'application/x-www-form-urlencoded' |
| payload        | Object | The payload for post requests.                                                         |

### Parameter Examples

A basic post request with no payload:

    =IMPORTJSONAPI("https://test.com/api", "$..Title", "@", "method=post")
    
A post request with a payload:

    =IMPORTJSONAPI("https://test.com/api", "$..Title", "@", "method=post", 'payload={ "user" : "andy", pass" : "pandy" }')

A request with Basic Authorizaton:

    =IMPORTJSONAPI("https://test.com/api", "$..Title", "@", 'headers={ "Authorization" : "Basic QWxhZGRpbjpPcGVuU2VzYW1l" }')

## GraphQL

  To query a GraphQL API endpoint you need to set the `method`, `contentType` and `payload` parameters.
  
  | Parameter   | Value                             |
  |-------------|-----------------------------------|
  | method      | post                              |
  | contentType | application/json                  |
  | payload     | { 'query': 'YOUR_GRAPHQL_QUERY' } |
  
  **Example**
  
     = IMPORTJSONAPI("https://api.graph.cool/simple/v1/swapi", "$..films[*]", "^^name, director", "method=post", "contentType=application/json", "payload={ 'query': '{ allPersons { name films { director } } }' }")

## Refreshing Data
By default Google Sheets only refreshes the results of a custom function every hour or so. If you want to force a refresh then this can be achieved by changing any of the function arguments. The easiest way of doing this is to add a 'dummy parameter' to the end of the function arguments. The dummy parameter should either be a number or a boolean and will be ignored by the import function.

**Example**

    =IMPORTJSONAPI("https://test.com/api", "$..Title", "@", 1)

You can now force a refresh by incrementing the number 1.

## Debugging
When you are trying to create the JSONPath query to filter your data, it is sometimes difficult to tell if you are getting the correct results. To help with this you should set the columns parameter to a single '@'. This will then output the list of objects that is being returned by the query. Once you are happy with the results you can then modify the columns to extract the relevant fields.

**Example**

    =IMPORTJSONAPI("https://test.com/api", "$..book[?(@parent.bicycle && @parent.bicycle.color === "red")].category", "@")
