var intersections = [];

$(function(){
  var map = L.map('map',{
    scrollWheelZoom : false
  }).setView([51.2120370, 4.3972438], 17);

  //Add tile layer from Mapbox
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 17,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1IjoibGFtYXNhdXJ1cyIsImEiOiJjamV5ZTYyZjUxNWYzMndwdWQ0YTBrZWJhIn0.c7Mb44YmSAV6R-c2BeuOiA'
  }).addTo(map);

  var xmlHttp = new XMLHttpRequest();

  xmlHttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var catalog = JSON.parse(this.responseText);

      for (var maps of catalog["@graph"]){
        for(var intersection of maps.map.intersections){
          console.log(intersection)
          var new_intersection = new Intersection(intersection.id.id, intersection.name, intersection.laneSet, intersection.url);
          intersections.push(new_intersection);
          new_intersection.add_to_map(map);
        }
      }
    }
  };

  var lane_info_panel = document.createElement("div")
  lane_info_panel.id = "lane_info_panel"
  lane_info_panel.innerHTML = "<h4>Lane status:</h4> <p id='lane_status'>Hover over a lane.</p>"

  document.getElementById("map").appendChild(lane_info_panel)

  xmlHttp.open( "GET", 'https://localhost:3000', false ); // false for synchronous request
  xmlHttp.send( null );
});