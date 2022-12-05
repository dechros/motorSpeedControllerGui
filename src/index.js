import "./style.css";
import { Chart, LineController, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js';

Chart.register(LineController)
Chart.register(CategoryScale)
Chart.register(LinearScale)
Chart.register(PointElement)
Chart.register(LineElement)

/* Graph Variables */
var rpmBufferArray = [];
var rpmShownArray = [];
var timeAxisArray = [];

/* Message Headers and Footers */
var refreshMessageHeader = "REF-";
var fileListHeader = "FILE-";
var messageFooter = "-WEB-END";

/* Other Variables */
var webResponseWaiting = false;
var newPointCount = 0;
var enableRealTimeUpdate = true;

/* Graph Point Count and Zoom Variables */
const graphPointCountMax = 2000;
const graphPointCountMin = 40;
var graphPointCount = graphPointCountMin;

window.addEventListener("DOMContentLoaded", function () {
	resetGraph();
	const ctx = document.getElementById("rpmChart").getContext("2d");
	const options = {
		animation: {
			duration: 0
		}
	}
	const data = {
		labels: timeAxisArray,
		datasets: [
			{
				data: rpmShownArray,
				label: "rpm",
				borderColor: "#3e98cd",
				fill: false,
				cubicInterpolationMode: 'monotone',
				tension: 0.8,
				pointRadius: 0
			}
		]
	}
	var myChart = new Chart(ctx, {
		type: 'line',
		data,
		options
	});

	zoomInButton.addEventListener("click", zoomInClicked);
	zoomOutButton.addEventListener("click", zoomOutClicked);
	dataAnalysingButton.addEventListener("click", dataAnalysingClicked);
	closeOverlayButton.addEventListener("click", closeOverlayClicked);
	liveViewButton.addEventListener("click", liveViewClicked);

	setInterval(updateGraphThread, 10);

	function updateGraphThread() {
		if (enableRealTimeUpdate == true) {
			if (newPointCount > 0) {
				myChart.destroy();
				for (var i = 0; i < newPointCount; i++) {
					rpmShownArray.push(rpmBufferArray[rpmBufferArray.length - newPointCount + i]);
					rpmShownArray.shift();
					timeAxisArray.push(timeAxisArray[timeAxisArray.length - 1] + 1);
					timeAxisArray.shift();
				}
				newPointCount = 0;
				myChart = new Chart(ctx, {
					type: 'line',
					data,
					options
				});
			}
			else {
				getPointsFromStm();
			}
		}
	}

	function getPointsFromStm() {
		if (webResponseWaiting == false) {
			var client = new HttpClient();
			var incomingMessage = "";
			client.get('http://192.168.0.31/refresh_graph', function (response) {
				incomingMessage = response;
				var headerResult = incomingMessage.includes(refreshMessageHeader);
				var footerResult = incomingMessage.includes(messageFooter);
				if (headerResult == true && footerResult == true) {
					incomingMessage = incomingMessage.replace(refreshMessageHeader, '');
					incomingMessage = incomingMessage.replace(messageFooter, '');
					var numberArray = incomingMessage.split('-').map(Number);
					for (var i = 0; i < numberArray.length; i++) {
						rpmBufferArray.push(numberArray[i]);
						rpmBufferArray.shift();
						newPointCount++;
					}
				}
				else {
					console.log("  ## False message error!");
				}
			});
		}
	}

	var HttpClient = function () {
		this.get = function (aUrl, aCallback) {
			var anHttpRequest = new XMLHttpRequest();
			anHttpRequest.onreadystatechange = function () {
				if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200) {
					webResponseWaiting = false;
					aCallback(anHttpRequest.responseText);
				}
			}
			webResponseWaiting = true;
			anHttpRequest.open("GET", aUrl, true);
			anHttpRequest.send(null);
		}
	}

	function resetGraph() {
		rpmShownArray.length = 1;
		timeAxisArray.length = 1;
		rpmBufferArray.length = 1;

		for (var i = 0; i < 2000; i++) {
			rpmBufferArray.push(0);
		}
		for (var i = 0; i < graphPointCount; i++) {
			rpmShownArray.push(rpmBufferArray[rpmBufferArray.length - graphPointCount + i]);
		}
		for (var i = 0; i < graphPointCount; i++) {
			timeAxisArray.push(i);
		}
	}

	function liveViewClicked() {
		resetGraph();
		enableRealTimeUpdate = true;
		web_header.innerHTML = "Live Data Monitor";
	}

	function zoomOutClicked() {
		graphPointCount += 40;
		if (graphPointCount > graphPointCountMax) {
			graphPointCount = graphPointCountMax;
		}
		graphPointcountChanged();
	}

	function zoomInClicked() {
		graphPointCount -= 40;
		if (graphPointCount < graphPointCountMin) {
			graphPointCount = graphPointCountMin;
		}
		graphPointcountChanged();
	}

	function fileButtonClicked() {
		console.log("Clicked : " + this.innerHTML);
		closeOverlayClicked();
		enableRealTimeUpdate = false;
		web_header.innerHTML = "Offline Data Monitor";
		var client = new HttpClient();
		var incomingMessage = "";
		client.get('http://192.168.0.31/get_file' + this.innerHTML, function (response) {
			incomingMessage = response;
			var headerResult = incomingMessage.includes(fileListHeader);
			var footerResult = incomingMessage.includes(messageFooter);
			if (headerResult == true && footerResult == true) {
				incomingMessage = incomingMessage.replace(fileListHeader, '');
				incomingMessage = incomingMessage.replace(messageFooter, '');
				var numberArray = incomingMessage.split('-').map(Number);
				myChart.destroy();
				resetGraph();
				for (var i = 0; i < numberArray.length; i++) {
					rpmBufferArray.push(numberArray[i]);
					rpmBufferArray.shift();
				}
				for (var i = 0; i < graphPointCount; i++) {
					rpmShownArray.push(rpmBufferArray[rpmBufferArray.length - graphPointCount + i]);
					rpmShownArray.shift();
					timeAxisArray.push(0);
					timeAxisArray.shift();
				}
				myChart = new Chart(ctx, {
					type: 'line',
					data,
					options
				});
			}
			else {
				console.log("  ## False message error!");
			}
		});
	}

	function closeOverlayClicked() {
		document.getElementById("overlay").style.display = "none";
		var fileTable = document.getElementById("overlayTable");
		while (fileTable.firstChild) {
			fileTable.removeChild(fileTable.firstChild);
		}
	}

	function dataAnalysingClicked() {
		var client = new HttpClient();
		var incomingMessage = "";
		client.get('http://192.168.0.31/file_list', function (response) {
			incomingMessage = response;
			var headerResult = incomingMessage.includes(fileListHeader);
			var footerResult = incomingMessage.includes(messageFooter);
			if (headerResult == true && footerResult == true) {
				incomingMessage = incomingMessage.replace(fileListHeader, '');
				incomingMessage = incomingMessage.replace(messageFooter, '');
				var fileListRaw = incomingMessage.split('-');
				var fileList = [];
				for (var i = 0; i < fileListRaw.length; i++) {
					fileListRaw[i] = fileListRaw[i].toLowerCase();
					if (fileListRaw[i].includes(".txt") == true) {
						fileList.push(fileListRaw[i]);
					}
				}
				fileList.sort();
				var tdList = [];
				for (var i = 0; i < fileList.length / 15; i++) {
					tdList.push(document.createElement("td"));
				}
				var activeTd;
				var tdListIndex = 0;
				for (var i = 0; i < fileList.length; i++) {
					if (i % 15 == 0) {
						activeTd = tdList[tdListIndex];
						activeTd.setAttribute("id", "td" + tdListIndex);
						document.getElementById("overlayTable").appendChild(activeTd);
						tdListIndex++;
					}
					var tr = document.createElement("tr");
					tr.setAttribute("id", "tr" + i);
					var btn = document.createElement("button");
					btn.innerHTML = fileList[i];
					btn.onclick = fileButtonClicked;
					btn.setAttribute("class", "overlay_buttons");
					tr.appendChild(btn);
					activeTd.appendChild(tr);
				}
			}
			else {
				console.log("  ## False message error!");
			}
		});
		document.getElementById("overlay").style.display = "block";
	}

	function graphPointcountChanged() {
		myChart.destroy();
		var maxTime = timeAxisArray[timeAxisArray.length - 1];
		rpmShownArray.length = 1;
		timeAxisArray.length = 1;
		for (var i = 0; i < graphPointCount; i++) {
			rpmShownArray.push(rpmBufferArray[rpmBufferArray.length - graphPointCount + i]);
			var newTime = maxTime - graphPointCount + i;
			if (newTime < 0) {
				timeAxisArray.push(0);
			}
			else {
				timeAxisArray.push(maxTime - graphPointCount + i);
			}
		}
		if (rpmShownArray.length != timeAxisArray.length) {
			console.log("Size error.");
		}
		myChart = new Chart(ctx, {
			type: 'line',
			data,
			options
		});
	}
}, false);
