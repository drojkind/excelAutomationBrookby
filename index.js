'use strict';
const excelToJson = require('convert-excel-to-json');
const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const currentPath = process.cwd();

var XLSX = require('xlsx');
var workbook = XLSX.readFile('brookby.xlsx');
var sheet_name_list = workbook.SheetNames;

let dateKeys = [];
let jsonOutput = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
//Date keys allow us to see when new JSON data for a new date starts and ends.
jsonOutput.map(data => data.__EMPTY_1).forEach(function(data2, index) {
  if (_.includes(data2, 'Date Out :') === true) {
    console.log(data2, index);
    //We convert date to Excel sheet standard...
    console.log(moment(data2.match(/\d{1,2}\D\d{1,2}\D(\d{4})/g)[0], 'DD/MM/YYYY').format('D-MMM'))
    dateKeys.push([index, moment(data2.match(/\d{1,2}\D\d{1,2}\D(\d{4})/g)[0], 'DD/MM/YYYY').format('D-MMM')]);
  }
});

console.log(dateKeys.filter(data => data[0]));
dateKeys.forEach(function(data, index) {
  // console.log(jsonOutput.slice(dateKeys[index] + 2, dateKeys[index + 1] - 2));
  var indexIs = index + 1;
  // console.log(indexIs);
  // console.log(dateKeys[index][0] + 2, ' PLUSSSS!!!');
  // //console.log(dateKeys[index + 1][0] - 2, ' MINUSSS!!!');
  // console.log(dateKeys[index]);
  // console.log(dateKeys[index + 1]);
  console.log(index + 1 !== dateKeys.length);
  console.log(index);
  console.log(dateKeys.length)
  if(index + 1 !== dateKeys.length){
    writeJson(jsonOutput.slice(dateKeys[index][0] + 2, dateKeys[indexIs][0] - 2), dateKeys[index][1]);
  } else{
    writeJson(jsonOutput.slice(dateKeys[index][0] + 2, jsonOutput.length - 4), dateKeys[index][1]);
  }
})
//We can go two items forward from the first record, and two items back fromt the last.
// For the last record we go two items forward and then 4 items back from the last item.

// console.log(jsonOutput.slice(3, 39)); //
// console.log(jsonOutput.slice(43, 95));
// console.log(jsonOutput.slice(99, 143));
// console.log(jsonOutput.slice(199, 224));
//console.log(jsonOutput.slice(228, jsonOutput.length - 4));

function writeJson(data, index) {
  //console.log(index, data);
  // fs.writeFile(currentPath + "// " + index + "test.json", JSON.stringify(data), (error) => {
  //   console.log("Error!", error);
  // });

  fs.writeFile(currentPath + "// " + index + "test.json", JSON.stringify(data), function (err) {
    if(err){
        throw err;
    }
});
  console.log("The file was saved! : " + index);

}
