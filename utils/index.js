'use strict';
const excelToJson = require('convert-excel-to-json');
const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const Json2csvParser = require('json2csv').Parser;
// const fields = ['date', 'quarry', 'null1', 'null2', 'docket', 'jobNo', 'null3', 'delivery', 'null4', 'null5', 'null6', 'rego','null0', 'product', 'weight', 'startTime', 'endTime', 'null7', 'null8', 'null9', 'startKm', 'endKm'];
const fields = ['date', 'quarry', 'docket', 'jobNo', 'delivery', 'rego', 'product', 'weight', 'startTime', 'endTime', 'startKm', 'endKm'];
const currentPath = process.cwd();

var XLSX = require('xlsx');

const brookbyKeys = require('./utils/keys/brookby.json');


let dateKeys = []; // Key showing start index for a date range and the date in format ['1', '3-Mar']
let dateArray = [];
let selectedDateArray = [];
let dateArrayConverted = [];


function dragData(data) {
  var workbook = XLSX.readFile(data);
  var sheet_name_list = workbook.SheetNames;
  let jsonOutput = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);

  //Date keys allow us to see when new JSON data for a new date starts and ends.
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
  }

  //We select the date we want to output for our excel sheet via outputData function
  //Currently we iterate through each date and make a large file, date selection could be built into the app.
  dateKeys.forEach(function(data) {
    console.log(data[1])
    outputData(data[1]);
  })

  function outputData(date) {
    selectedDateArray.push(dateArray[_.findIndex(dateKeys, function(o) {
      return o[1] == date;
    })])
    let data = selectedDateArray[0][0];
    selectedDateArray[0].forEach(function(data, index) {
      //let data = selectedDateArray[0][0];
      console.log(data, index);
      dateArrayConverted.push({
        date: date,
        quarry: 'KB',
        docket: data.Docket,
        jobNo: data['Order Name'].substring(0, 4),
        delivery: 'E',
        rego: data.Vehicle,
        product: data['Product Name'],
        weight: parseWeight(data.Net),
        startTime: roundTime(data['Time Out'], "floor"),
        endTime: getNextTime(data, index),
        startKm: 'no data',
        endKm: 'no data',
      })
    })
    //We get the end time for the next trip. Showing when the truck returned to the quarry.
    //Refactor should include GPS data to correlate information...
    function getNextTime(data, index){
      console.log('this is data', data);
      let sliceFilter = _.filter(selectedDateArray[0].slice(index+1,selectedDateArray[0].length), { 'Vehicle': data.Vehicle});
      if(sliceFilter.length !== 0){
        return roundTime(sliceFilter[0]['Time In'], "ceil");
      } else {
        return "MANUAL ENTRY";
      }
      // console.log(sliceFilter);
      // console.log(selectedDateArray[0][index]);
      // console.log(selectedDateArray[0].slice(index,selectedDateArray[0].length));
      // console.log(index);
      // console.log(selectedDateArray[0].length);
      // return roundTime(data['Time In']);
    }

    // console.log("GET KEY BY VALUE!!!!! - ",getKeyByValue(brookbyKeys, "MANARC 65"));

    function getKeyByValue(object, value) {
      return Object.keys(object).or(o => o[key] === value)
    }

    function productNameMatch(name) {
      //console.log(brookbyKeys;
      //console.log(brookbyKeys[1]);
    }

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
    //We round the time. Currently rounding down.
    //Takes in (time, height). Time being a 
    function roundTime(time, height) {
      console.log(time);
      var date = moment(time, 'HH:mm:ss');
      var roundedDate = round(date, moment.duration(15, "minutes"), height);
      return roundedDate.format('hh:mm:ss A');
    }

    function round(date, duration, method) {
      return moment(Math[method]((+date) / (+duration)) * (+duration));
    }

  } //OutPutdata Function
  //console.log('WE ARE DONE!');

  function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }
  //Instantiate Json2Csv and set headers via fields.
  const json2csvParser = new Json2csvParser({
    fields
  });
  //Lodash sort function by date and rego.
  const csv = json2csvParser.parse(_.sortBy(dateArrayConverted, ['date', 'rego']));
  fs.writeFile(currentPath + "//data-export-" + moment().format('YYYY-MM-DDTHH:mm:ss.SSS') + ".csv", csv, function(err) {
    if (err) {
      throw err;
      return Promise.reject('Rejected');
    } else {
      console.log("The file was saved!");
      //After we have succesfully written our file we wipe data from our arrays.
      dateKeys = []; // Key showing start index for a date range and the date in format ['1', '3-Mar']
      dateArray = [];
      selectedDateArray = [];
      dateArrayConverted = [];
    }
  });
  //We return a res
  return Promise.resolve('Resolved');
}
