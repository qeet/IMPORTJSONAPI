# IMPORTJSONAPI

Provides a custom function to selectively extract data from a JSON or GraphQL API in a tabular format suitable for import into a Google Sheets spreadsheet.

## Changelog
- v1.0.0 - Initial release

## Installation

**NOTE: THIS SCRIPT REQUIRES THE NEW V8 RUNTIME - SEE STEP 3**

To add this custom function to your spreadsheet, follow this procedure:

1. Open the spreadsheet in your browser.
2. Select the `Tools > Script editor` menu option. This will open a script editor window. You will need to copy and paste the function code into a blank script file.
3. IMPORTANT - This script conatins functionality that requires the V8 runtime in order to work. To enable this select the `Run > Enable new Apps Script runtime powered by Chrome V8` option.
3. Copy the contents of the IMPORTJSONAPI.gs. The raw file can found [here](https://raw.githubusercontent.com/qeet/IMPORTJSONAPI/master/IMPORTJSONAPI.gs). 
4. Paste this into the Code.gs script file.
5. Select the `File > Save` menu option to save the script.
6. You should now be able to use the `=IMPORTJSONAPI()` function in your sheet.

## Usage

    =IMPORTJSON(URL, JSONPath Query, Columns [,Param] [,Param])

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
| **Columns**        | Comma seperarted list of column path expressions                                  |
| **Param**          | Optional list of parameters                                                       |

### URL
The URL of the API endpoint. Any query parameters containing characters such as '&' or '=' should be urlencoded. For example:

    =IMPORTJSONAPI("https://api.test.com/store?api_token=ds45%3F6hjkd%3Ddjs, ...)

### JSONPath Query
The JSONPath expression to select the data that you wish to extract. Each JSON object matched by the expression will become a row in your spreadsheet. An introduction to JSONPath expressions can be found at <http://goessner.net/articles/JsonPath/>.

The actual JSONPath query implementation used is [JSONPath Plus](https://github.com/s3u/JSONPath) which contains some additional functionality and [examples](https://github.com/s3u/JSONPath#syntax-through-examples).

### Columns

The Columns paramter is a comma seperated list of path expressions. Path expressions contain one or more of the following components optionally seperated by a period '.'. 

| Component     |  Description                                                                      |
|---------------|-----------------------------------------------------------------------------------|
| **keyname**   | Specifies the key to a value. Must be quoted if it contains characters other than letters, numbers or the underscore character. if the name contains a comma ',' then it must always be escaped by using %2C instead. |       
| **[index]**   | Access an array with the specified index.                                         |
| **@**         | The current value.                                                                |
| **^**         | The parent of the current value.                                                  |
| **~**         | The key name of the current value. This must always appear last in the path.      |
| **$**         | The root of the JSON object. This must always appear first in the path.           |

### Column path expression examples

All example are based on the following JSON Object:

```json
{
  "book" : {
    "title": "It",
    "author": "S. King",
    "orders" : [28, 72]
  }
}
```

| JsonPath      | Value                                                      | Columns       | Result         |
|---------------|------------------------------------------------------------|---------------|----------------|
| $.book        | { "title": "It", "author": "S. King","orders" : [28, 72] } | title, author | "It", "S.King" |
| $.book.title  | "It"                                                       | @             | "It"           |
| $.book.orders | [28, 72]                                                   | @             | "28, 72"       | 

### Params

## Examples
## GraphQL
## Refreshing Data
