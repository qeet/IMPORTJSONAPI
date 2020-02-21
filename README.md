# IMPORTJSONAPI

Provides a custom function to selectively extract data from a JSON or GraphQL API in a tabular format suitable for import into a Google Sheets spreadsheet.

## Version
- v1.0.0 - Initial release

## Installation
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
    
An example:

    =IMPORTJSONAPI("http://data.nba.net/10s/prod/v1/2018/teams.json", "$.league.*[*]", "^.~, city, isNBAFranchise")


| Parameter          |  Description                                                                      |
|--------------------|-----------------------------------------------------------------------------------|
| **URL**            | The URL endpoint of the API                                                      |
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

### Params
