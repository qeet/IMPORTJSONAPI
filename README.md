# IMPORTJSONAPI

Provides a custom function to selectively extract data from a JSON or GraphQL API in a tabular format suitable for import into a Google Sheets spreadsheet.

## Version
- v1.0.0 - Initial release

## Installation
To add this custom function to your spreadsheet, follow this procedure:

1. Open the spreadsheet in your browser.
2. Select the `Tools > Script editor` menu option. This will open a script editor window. You will need to copy and paste the function code into a blank script file.
3. IMPORTANT - This script conatins functionality that requires the V8 runtime in order to work. To enable this select the `Run > Enable new Apps Script runtime powered by Chrome V8` option.
3. Copy the contents of the FIXME! [IMPORTJSONAPI.gs file] (https://raw.githubusercontent.com/qeet/ImportJSONEx/master/ImportJSONEx.gs) 
4. Paste this into the Code.gs script file.
5. Select the `File > Save` menu option to save the script.
6. You should now be able to use the `=IMPORTJSONAPI()` function in your sheet.

## Usage

    =IMPORTJSON(URL, JSONPath Query, Columns [,Param] [,Param])
    
An example:

    =IMPORTJSONAPI("http://data.nba.net/10s/prod/v1/2018/teams.json", "$.league.*[*]", "^.~, city, isNBAFranchise")


| Parameter          |  Description                                                                      |
|--------------------|-----------------------------------------------------------------------------------|
| **URL**            | The URL end-point of the API                                                      |
| **JSONPath Query** | JSONPath query expression                                                         |
| **Columns**        | Comma seperarted list of column path expressions                                  |
| **Param**          | Optional list of parameters                                                       |

## URL

## JSONPath Query

## Columns

## Params
