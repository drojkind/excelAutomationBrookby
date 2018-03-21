const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const Json2csvParser = require('json2csv').Parser;

const fields = ['date', 'quarry', 'docket', 'jobNo', 'delivery', 'rego', 'product', 'weight', 'startTime', 'endTime', 'startKm', 'endKm'];
const currentPath = process.cwd();
const XLSX = require('xlsx');

const brookbyKeys = require('./utils/keys/brookby.json');

let dateKeys = []; // Key showing start index for a date range and the date in format ['1', '3-Mar']
let dateArray = [];
let selectedDateArray = [];
let dateArrayConverted = [];

// We get the path for the file that was dragged onto the app.
function dragData(data) {
  const workbook = XLSX.readFile(data);
  const sheetNameList = workbook.SheetNames;
  const jsonOutput = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]]);

  // Date keys allow us to see when new JSON data for a new date starts and ends.
  jsonOutput.map(data => data.__EMPTY_1).forEach((data2, index) => {
    if (_.includes(data2, 'Date Out :') === true) {
      // We convert date to Excel sheet standard...
      // We use regex to parse out date from the string.
      dateKeys.push([index, moment(data2.match(/\d{1,2}\D\d{1,2}\D(\d{4})/g)[0], 'DD/MM/YYYY').format('D-MMM')]);
    }
  });

  // We push split array into dateArray
  function splitDateArray(data) {
    dateArray.push(data);
  }

  /**
   * We can go two items forward from the first record, and two items back fromt the last.
   * For the last record we go two items forward and then 4 items back from the last item.
   */
  dateKeys.forEach((data, index) => {
    const indexIs = index + 1;
    if (index + 1 !== dateKeys.length) {
      splitDateArray(
        jsonOutput.slice(
          dateKeys[index][0] + 2,
          dateKeys[indexIs][0] - 2,
        ),
        dateKeys[index][1],
      );
    } else {
      splitDateArray(
        jsonOutput.slice(
          dateKeys[index][0] + 2,
          jsonOutput.length - 4,
        ),
        dateKeys[index][1],
      );
    }
  });

  function outputData(date) {
    /**
     * getDistance - Gets distance between a quarry and a site.
     *
     * @param {string} site 4 digit string.
     * @return {type}      description
     */
    function getDistance(site) {
      return fetch('https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=Washington,DC&destinations=New+York+City,NY&key=AIzaSyD3DrGL7mk0IXupL8BWqoq0pRofJdOeIBc').then(response =>
        // Convert to JSON
        response.json()).then(j =>
        // Yay, `j` is a JavaScript object
        j.rows[0].elements[0].distance.value);
    }

    selectedDateArray.push(dateArray[_.findIndex(dateKeys, o => o[1] === date)]);
    const data = selectedDateArray[0][0];

    function round(date, duration, method) {
      return moment(Math[method]((+date) / (+duration)) * (+duration));
    }

    /**
     * roundTime - We round the time. Up or down.
     * Should refactor to round up or down based on closest 15 min.
     * @param  {string} time Receives time.
     * @param  {string} height Take in variable 'floor' or 'height'
     * @return {string} return rounded date in the correct format.
     */
    function roundTime(time, height) {
      console.log(time);
      const date = moment(time, 'HH:mm:ss');
      const roundedDate = round(date, moment.duration(15, 'minutes'), height);
      return Promise.resolve(roundedDate.format('hh:mm:ss A'));
    }

    /**
     * getNextTime - We get the end time for the next trip.
     * Showing when the truck returned to the quarry.
     * Refactor should include GPS data to correlate information.
     *
     * @param  {string} data  description
     * @param  {int} index description
     * @return {string} Return rounded time.
     */
    function getNextTime(data, index) {
      const sliceFilter = _.filter(selectedDateArray[0]
        .slice(index + 1, selectedDateArray[0].length), {
        Vehicle: data.Vehicle,
      });
      if (sliceFilter.length !== 0) {
        return Promise.resolve(roundTime(sliceFilter[0]['Time In'], 'ceil'));
      }
      return Promise.resolve('MANUAL ENTRY');
    }

    /**
     * productNameMatch - We match the keys from brookby with our products.
     * If no key is found we use the default value...
     *
     * @param  {string} name We insert a product name.
     * @return {type} Return the product matched from brookby.json.
     * If no match is found we return the name that was input.
     */
    function productNameMatch(name) {
      if (brookbyKeys[name] === undefined) {
        return Promise.resolve(name);
      }
      return Promise.resolve(brookbyKeys[name]);
    }

    /**
     * parseWeight - We take a weight string and set '.' in the correct
     * position depending on if it is 5 or 4 characters...
     *
     * @param  {string} weight pass in weight string.
     * @return {string} with the correct decimal point notation.
     */
    function parseWeight(weight) {
      if (weight.length === 5) {
        return Promise.resolve(`${weight.substring(0, 2)}.${weight.substring(2, 4)}`);
      } else if (weight.length === 4) {
        return Promise.resolve(`${weight.substring(0, 1)}.${weight.substring(1, 3)}`);
      }
      return Promise.resolve('WEIGHT ERROR!');
    }

    selectedDateArray[0].forEach((data, index) => {
      Promise.all([
        getDistance('data'),
        getNextTime(data, index),
        roundTime(data['Time Out'], 'floor'),
        parseWeight(data.Net),
        productNameMatch(data['Product Name']),
      ]).then((promise) => {
        dateArrayConverted.push({
          date,
          quarry: 'KB',
          docket: data.Docket,
          jobNo: data['Order Name'].substring(0, 4),
          delivery: 'E',
          rego: data.Vehicle,
          product: promise[4],
          weight: promise[3],
          startTime: promise[2],
          endTime: promise[1],
          startKm: 0,
          endKm: promise[0],
        });
      });
    });
    return Promise.resolve('Resolved');
  }

  /**
   * We select the date we want to output for our excel sheet via outputData function
   * Currently we iterate through each date and make a large file,
   * date selection could be built into the app.
   */
  let forCount = 0;
  dateKeys.forEach((data, index) => {
    forCount += 1;
    // outputData(data[1]);
    // We build csv when loop has finished...
    if (forCount === dateKeys.length) {
      console.log('IS THIS TRIGGERING ON DATE KEYS AND FOR COUNT MATCH!!??!');
      outputData(data[1]).then((data) => {
        exportCsv();
      });
    } else {
      outputData(data[1]);
    }
  });

  function exportCsv() {
    /**
     * Instantiate Json2Csv and set headers via fields.
     */
    const json2csvParser = new Json2csvParser({
      fields,
    });

    const csv = json2csvParser.parse(_.sortBy(dateArrayConverted, ['date', 'rego']));

    fs.writeFile(`${currentPath}//data-export-${moment().format('YYYY-MM-DDTHH:mm:ss.SSS')}.csv`, csv, (err) => {
      if (err) {
        throw err;
      } else {
        console.log('The file was saved!');
        // After we have succesfully written our file we wipe data from our arrays.
        // Key showing start index for a date range and the date in format ['1', '3-Mar']
        dateKeys = [];
        dateArray = [];
        selectedDateArray = [];
        dateArrayConverted = [];
      }
    });
  }

  return Promise.resolve('Resolved');
}
