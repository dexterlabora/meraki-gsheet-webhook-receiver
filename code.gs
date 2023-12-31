/*
Copy this function over the existing Code.gs file in a Google Sheet
Save the Sheet/Script
Publish App 
- Execute as You
- Avaiable to Anyone (including anonymous)
Authorize App when prompted
The URL will act as the Webhook URL for Meraki to send alerts
*/

// Flattens a nested object for easier use with a spreadsheet
function flattenObject(ob) {
   var toReturn = {};	
	for (var i in ob) {
		if (!ob.hasOwnProperty(i)) continue;		
		if ((typeof ob[i]) == 'object') {
			var flatObject = flattenObject(ob[i]);
			for (var x in flatObject) {
				if (!flatObject.hasOwnProperty(x)) continue;				
				toReturn[i + '.' + x] = flatObject[x];
			}
		} else {
			toReturn[i] = ob[i];
		}
	}
	return toReturn;
};

// formats a key/value to UTC time based on selected keys
function changeTimeFormat(key,value){
  var keysToFormat = ['sentAt', 'occurredAt','alertData.timestamp'];
  if(keysToFormat.indexOf(key) > -1){
        var date = new Date(value*1000).toUTCString();
        return date 
  }else{
    return value;
  }
}

// Google sheets are created with 26 columns, but some alerts contain more than 26 keys 
// As each key is inserted into its own column, having more keys than columns causes an out of bounds error 
// This functions add the appropirate amount of extra columns if required
function addExtraColumns(alertSheet, keylength) { 
  var sheet_column_count = alertSheet.getMaxColumns() 
  var extra_columns_required = keylength - sheet_column_count 
  if (extra_columns_required > 0) { 
    alertSheet.insertColumns(1, extra_columns_required) 
  } 
} 

function setHeaders(sheet, values){
   var headerRow = sheet.getRange(1, 1, 1, values.length)
    headerRow.setValues([values]);  
    headerRow.setFontWeight("bold").setHorizontalAlignment("center");
}

function display(data){
  
  // Flatten JSON object and extract keys and values into seperate arrays
  var flat = flattenObject(data);
  var keys = Object.keys(flat);
  var values = [];
  var headers = [];
  var alertSheet;
  if(data['callbackId'])
  {
    data['alertType'] = "callback";
  }
  
  // Find or create sheet for alert type and set headers
  var alertType = data['alertType'];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(alertType) == null){
    ss.insertSheet(alertType); 
    // Create Headers and Format
    alertSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(alertType);
    addExtraColumns(alertSheet, keys.length)
    alertSheet.setColumnWidths(1, keys.length, 200)
    headers = keys;
  }else {
    alertSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(alertType);
    // retrieve existing headers
    headers = alertSheet.getRange(1, 1, 1, alertSheet.getLastColumn() || 1).getValues()[0]; 
    // add any additional headers
    var newHeaders = [];
    newHeaders = keys.filter(function(k){ return headers.indexOf(k)>-1?false:k;});
    newHeaders.forEach(function(h){
      headers.push(h);
    });  
  }
  Logger.log('headers: ' + headers);
  setHeaders(alertSheet, headers);
  
  // push values based on headers
  headers.forEach(function(h){
    values.push(flat[h]);
  });
  
  // Insert Data into Sheet
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(alertType);
  var lastRow = Math.max(sheet.getLastRow(),1);
  sheet.insertRowAfter(lastRow); 
  sheet.getRange(lastRow + 1, 1, 1, headers.length).setValues([values]).setFontWeight("normal").setHorizontalAlignment("center");
 
}

// Webhook GET request. Simply verifies that server is reachable.
function doGet(e) {
  return HtmlService.createHtmlOutput("Meraki Webhook Google Sheets");
}

// Webhook Receiver - triggered with post to pusblished App URL.
function doPost(e) {
  var params = JSON.stringify(e.postData.contents);
  params = JSON.parse(params);
  var postData = JSON.parse(params);
  
  display(postData);
  
  // HTTP Response
  return HtmlService.createHtmlOutput("post request received");
}

const testAlertWebhook = {
    "alertData": {
      "timestamp": 1536127239.706,
      "roi": { "top": 0, "left": 0, "width": 60, "height": 33 }
    },
    "alertId": "643451796765275003",
    "alertType": "Motion detected",
    "occurredAt": 1536127340.8236248,
    "sentAt": 1536127344.593023,
    "organizationId": "306XXXXX",
    "organizationName": "Miles Laboratory",
    "organizationUrl": "https://n143.meraki.com/o/3ZZIub/manage/organization/overview",
    "networkId": "L_643451796760XXXXX",
    "networkName": "Miles- Home",
    "networkUrl": "https://n143.meraki.com/Miles-Ho/n/RSv2xapc/manage/nodes/list",
    "deviceSerial": "Q2GV-ZZZZ-XXXX",
    "deviceMac": "34:56:fe:a3:24:06",
    "deviceName": "MV12w-desk-06",
    "deviceUrl": "https://n143.meraki.com/Miles-Ho/n/RSv2xapc/manage/nodes/new_list/57548243936262",
    "testParam2":"bar"
  };

const testCallbackWebhook = {"callbackId":"64345179676056123","organization":{"id":"123123","name":".Dexter's Laboratory"},"network":{"id":"64345179676056123123","name":".Amsterdam - switch"},"sentAt":"2023-11-07T06:24:28-08:00","message":{"pingId":"643451796836017651","url":"/devices/Q2BX-9QRR-XXXX/liveTools/pingDevice/64345179683601700","request":{"serial":"Q2BX-9QRR-XXXX","count":5},"status":"complete","results":{"sent":5,"received":5,"loss":{"percentage":0},"latencies":{"minimum":26.2,"average":42.3,"maximum":90.9},"replies":[{"sequenceId":0,"size":64,"latency":26.2},{"sequenceId":1,"size":64,"latency":28.2},{"sequenceId":2,"size":64,"latency":90.9},{"sequenceId":3,"size":64,"latency":34.4},{"sequenceId":4,"size":64,"latency":31.6}]}}}

function testAlert(){ 
  display(testAlertWebhook);
}

function testCallback(){ 
  display(testCallbackWebhook);
}