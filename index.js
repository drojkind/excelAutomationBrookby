'use strict';
const excelToJson = require('convert-excel-to-json');
const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const currentPath = process.cwd();

var XLSX = require('xlsx');
var workbook = XLSX.readFile('brookby.xlsx');
var sheet_name_list = workbook.SheetNames;

let dateKeys = []; // Key showing start index for a date range and the date in format ['1', '3-Mar']
let dateArray = [];
let selectedDateArray = [];
let dateArrayConverted = [];

let jsonOutput = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
//Date keys allow us to see when new JSON data for a new date starts and ends.
console.log(jsonOutput);
jsonOutput.map(data => data.__EMPTY_1).forEach(function(data2, index) {

  if (_.includes(data2, 'Date Out :') === true) {
    //We convert date to Excel sheet standard...
    //We use regex to parse out date from the string.
    dateKeys.push([index, moment(data2.match(/\d{1,2}\D\d{1,2}\D(\d{4})/g)[0], 'DD/MM/YYYY').format('D-MMM')]);
  }
});

dateKeys.forEach(function(data, index) {
  var indexIs = index + 1;
  //We can go two items forward from the first record, and two items back fromt the last.
  // For the last record we go two items forward and then 4 items back from the last item.
  if (index + 1 !== dateKeys.length) {
    splitDateArray(jsonOutput.slice(dateKeys[index][0] + 2, dateKeys[indexIs][0] - 2), dateKeys[index][1]);
  } else {
    splitDateArray(jsonOutput.slice(dateKeys[index][0] + 2, jsonOutput.length - 4), dateKeys[index][1]);
  }
})
//We push split array into dateArray
function splitDateArray(data, index) {
  dateArray.push(data);
  fs.writeFile(currentPath + "// " + index + ".json", JSON.stringify(data), function(err) {
    if (err) {
      throw err;
    } else {
      console.log("The file was saved! : " + index);
    }
  });
}
//We select the date we want to output for our excel sheet via outputData function
outputData('8-Mar');

function outputData(date) {
  selectedDateArray.push(dateArray[_.findIndex(dateKeys, function(o) {
    return o[1] == date;
  })])
  let data = selectedDateArray[0][0];
  console.log(selectedDateArray[0].map(data => data.Net));
  console.log(data);
  selectedDateArray[0].forEach(function(data) {
    //let data = selectedDateArray[0][0];
    dateArrayConverted.push({
      date: date,
      quarry: 'KB',
      docket: data.Docket,
      jobNo: data['Order Name'].substring(0, 4),
      delivery: 'E',
      rego: data.Vehicle,
      product: data['Product Name'],
      weight: parseWeight(data.Net),
      startTime: roundTime(data['Time Out']),
      endTime: 'no data',
      startKm: 'no data',
      endKm: 'no data',
    })
  })
  console.log(dateArrayConverted);

  //We take a weight string and set '.' in the correct position depending on if it is 5 or 4 characters...
  function parseWeight(weight) {
    if (weight.length === 5) {
      return weight.substring(0, 2) + '.' + weight.substring(2, 4);
    } else if (weight.length === 4) {
      return weight.substring(0, 1) + '.' + weight.substring(1, 3);
    } else {
      return 'WEIGHT ERROR!'
    }
  }
  //We
  function roundTime(time) {
    console.log(time);
    var date = moment(time, 'HH:mm:ss');
    var roundedDate = round(date, moment.duration(15, "minutes"), "floor");
    return roundedDate.format('hh:mm:ss A');
  }

  function round(date, duration, method) {
    return moment(Math[method]((+date) / (+duration)) * (+duration));
  }
}



//console.log(dateArray);
