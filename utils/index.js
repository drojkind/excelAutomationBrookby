const dotenv = require('dotenv').config();
const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const Json2csvParser = require('json2csv').Parser;
const XLSX = require('xlsx');
const brookbyKeys = require('./utils/keys/brookby.json');
const coordinates = require('./utils/keys/coordinates.json');
const deviceId = require('./utils/keys/deviceid.json');
const tripData = require('./utils/keys/tripData.json');

const currentPath = process.cwd();

let dateKeys = []; // Key showing start index for a date range and the date in format ['1', '3-Mar']
let dateArray = [];
let selectedDateArray = [];
let dateArrayConverted = [];
let distanceArray = [];

console.log(tripData.map(data => data.TravelledTrip.StartTime));
tripData.map((data) => {
  console.log(`
  TestIsoString: ${new Date('2018-03-26T07:01:35.000').toISOString()}
  TestIsoString END: ${new Date('2018-03-26T09:58:09.000').toISOString()}
  Biger than?: ${new Date(data.TravelledTrip.StartTime).toISOString() < new Date(data.TravelledTrip.EndTime).toISOString()}
  End Time ISO: ${new Date(data.TravelledTrip.EndTime).toISOString()}
  Start time local: ${new Date(data.TravelledTrip.StartTime)}
  End time local: ${new Date(data.TravelledTrip.EndTime)}
  End time: ${new Date(data.TravelledTrip.EndTime) < new Date(data.TravelledTrip.StartTime)}
  Duration: ${data.TravelledTrip.Duration}`);
});

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

  getTripData(deviceId.JQQ590, '2018-03-26', '2018-03-25T18:01:35.000Z', '2018-03-25T20:58:09.000Z'); // Get trip data function.

  /**
   * getTripData - description
   *
   * @param  {int} vehicleId vehicleID mathced from deviceID
   * @param  {type} date      date you want to search
   * @return {type}           returns...nothing currenyl
   */
  function getTripData(vehicleId, date, startTime, endTime) {
    let distanceCount = 0;
    fetch(`http://webapi.blackhawktracking.com/api/VehicleTrip/Get?vehicleId=${vehicleId}&startDate=${date}T00:00:00.000&endDate=${date}T23:59:59.280&includeGeometries=true&geometryFormat=esrijson`, {
      headers: {
        Accept: 'application/json',
        token: '2A007AC2-4BAD-4625-BF2F-D5DFFE31A44D',
      },
      method: 'GET',
    }).then(response => response.json()).then(j =>
      j.map(data => data.TravelledTrip).forEach((each, index) => {
        if (startTime > each.StartTime && endTime < each.EndTime) {
          j[index].TravelledTrip.WithinSpeed.forEach((each, index) => {
            distanceArray.push({
              AverageSpeed: each.AverageSpeed,
              Distance: each.Distance,
              StartTime: each.StartTime,
              EndTime: each.EndTime,
              type: 'Within speed',
            });
          });
          j[index].TravelledTrip.OverSpeed.forEach((each, index) => {
            distanceArray.push({
              AverageSpeed: each.AverageSpeed,
              Distance: each.Distance,
              StartTime: each.StartTime,
              EndTime: each.EndTime,
              type: 'Over speed',
            });
          });
          j[index].TravelledTrip.OffRoad.forEach((each, index) => {
            distanceArray.push({
              AverageSpeed: each.AverageSpeed,
              Distance: each.Distance,
              StartTime: each.StartTime,
              EndTime: each.EndTime,
              type: 'Off road',
            });
          });
        }
        const orderedArray = _.orderBy(distanceArray, ['StartTime'], ['asc']);
        let startIndex;
        let endIndex;

        _.orderBy(orderedArray).forEach((each, index) => {
          if (startTime >= each.StartTime && startTime <= each.EndTime) {
            startIndex = index;
          }
          if (endTime >= each.StartTime && endTime <= each.EndTime) {
            endIndex = index;
          }
        });

        orderedArray.slice(startIndex, endIndex).forEach((each, index) => {
          distanceCount += each.Distance;
        });
        console.log('THIS IS THE TOTAL DISTANCE', distanceCount);
      }));
    console.log('return distance final', distanceCount);
  }


  function outputData(date, currentCount) {
    /**
     * getDistance - Gets distance between a quarry and a site.
     * @param {string} site 4 digit string.
     * @return {type}  distance between site and quarry.
     * Code should use GPS API currently using google distance API...
     */

    console.log(deviceId['5K511']);

    function getDistance(site) {
      console.log(site);
      return fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=-36.969591712031935,175.01331160311304&key=AIzaSyD3DrGL7mk0IXupL8BWqoq0pRofJdOeIBc&destinations=${coordinates[site].Position.Longitude},${coordinates[site].Position.Latitude}`).then(response =>
        response.json()).then(j =>
        parseDistance(j.rows[0].elements[0].distance.value) * 2);
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
      const date = moment(time, 'HH:mm:ss');
      const roundedDate = round(date, moment.duration(15, 'minutes'), height);
      return Promise.resolve(roundedDate.format('hh:mm:ss A'));
    }

    /**
     * parseDistance - Takes in raw distance
     * and returns value with proper spacing.
     * Should refactor...
     * @param  {type} distance Raw distance
     * @return {type} Distance with proper decimal.
     */
    function parseDistance(distance) {
      const string = distance.toString();
      if (string.length === 6) {
        return `${string.substring(0, 3)}.${string.substring(3, 5)}`;
      } else if (string.length === 5) {
        return `${string.substring(0, 2)}.${string.substring(2, 4)}`;
      } else if (string.length === 4) {
        return `${string.substring(0, 1)}.${string.substring(1, 3)}`;
      }
      return 'Incorrect distance.';
    }

    /**
     * getNextTime - We get the end time for the next trip.
     * Showing when the truck returned to the quarry.
     * Refactor should include GPS data to correlate information.
     * @param  {string} data  description
     * @param  {int} index description
     * @param {string} currentCount the current count of interior array.
     * @param {boolean} round if noround we dont round the value.
     * @return {string} Return rounded time.
     */
    function getNextTime(data, index, currentCount, round) {
      const sliceFilter = _.filter(selectedDateArray[currentCount]
        .slice(index + 1, selectedDateArray[currentCount].length), {
        Vehicle: data.Vehicle,
      });
      if (!round) {
        if (sliceFilter.length !== 0) {
          return Promise.resolve(sliceFilter[0]['Time In']);
        }
      } else if (sliceFilter.length !== 0) {
        return Promise.resolve(roundTime(sliceFilter[0]['Time In'], 'ceil'));
      }
      return Promise.resolve('MANUAL ENTRY');
    }

    /**
     * productNameMatch - We match the keys from brookby with our products.
     * If no key is found we use the default value...
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
    let dateCount = 0;
    selectedDateArray[currentCount].forEach((data, index) => {
      dateCount += 1;
      Promise.all([
        getNextTime(data, index, currentCount, false),
      ]).then((promise) => {
        console.log(`time out: ${data['Time Out']} time back: ${promise[0]} vehicle: ${data.Vehicle}`);
      });
      Promise.all([
        getDistance(data['Order Name'].substring(0, 4)),
        getNextTime(data, index, currentCount, true),
        roundTime(data['Time Out'], 'floor'),
        parseWeight(data.Net),
        productNameMatch(data['Product Name']),
      ]).then((promise) => {
        console.log(deviceId[data.Vehicle]);
        console.log(moment.utc('2018-03-30T19:47:40.933').valueOf());
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
      }).then(() => {
        // When the array has been iterated through we trigger CSV export...
        if (selectedDateArray.length === currentCount + 1) {
          if (index + 1 === dateCount) {
            exportCsv();
          }
        }
      });
    });
    return Promise.resolve('Resolved');
  }

  /**
   * We select the date we want to output for our excel sheet via outputData function
   * Currently we iterate through each date and make a large file,
   * date selection could be built into the app.
   */
  dateKeys.forEach((data, index) => {
    outputData(data[1], index);
  });

  function exportCsv() {
    /**
     * Instantiate Json2Csv and set headers via fields.
     */
    const fields = ['date', 'quarry', 'docket', 'jobNo', 'delivery', 'rego', 'product', 'weight', 'startTime', 'endTime', 'startKm', 'endKm'];
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
        // Key showing start index for a date range and the date in format ['1', '3-Mar'].
        dateKeys = [];
        dateArray = [];
        selectedDateArray = [];
        dateArrayConverted = [];
      }
    });
  }
  return Promise.resolve('Resolved');
}
