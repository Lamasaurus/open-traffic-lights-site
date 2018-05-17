var id_counter = 0;
var update_interval = null

const colors = {
  "gray": ["unavailable", "dark"],
  "red": ["stop-Then-Proceed", "stop-And-Remain"],
  "orange": ["permissive-Movement-Allowed", "protected-Movement-Allowed"],
  "green": ["permissive-clearance", "protected-clearance", "caution-Conflicting-Traffic"]
}

const color_rank = {
  "gray": 0,
  "red": 1,
  "orange": 2,
  "green": 3
}

class Intersection{
  constructor(id, name, lane_set, url){
    this.id = id
    this.url = url
    this.name = name
    this.lanes = {}
    this.lane_groups = {}

    for(var lane_data of lane_set){
      var new_lane = new Lane(lane_data.laneID, "ingressApproach" in lane_data , lane_data.nodeList.nodes, this.on_click.bind(this))
      this.lanes[lane_data.laneID] = new_lane

      if("connectsTo" in lane_data){
        for(var group of lane_data.connectsTo){

          // Create the group if it doesn't exist yet
          if(!(group.signalGroup in this.lane_groups))
            this.lane_groups[group.signalGroup] = []

          if(this.lane_groups[group.signalGroup].indexOf(group.connectingLane.lane) == -1 )
            this.lane_groups[group.signalGroup].push(group.connectingLane.lane)
          if(this.lane_groups[group.signalGroup].indexOf(lane_data.laneID) == -1 )
            this.lane_groups[group.signalGroup].push(lane_data.laneID)
        }
      }
    }

    console.log(this.lane_groups)
  }

  add_to_map(map){
    for(var id in this.lanes)
      this.lanes[id].add_to_map(map)
  }

  on_click(){

    if(this.active){
      this.source.close()
      this.active = false;

      for(var id in this.lanes){
        this.lanes[id].update()
      }

    }else{
      this.source = new EventSource('https://localhost:3000?uri=' + this.url);
      this.source.onmessage = (message => {
        var data = JSON.parse(message.data)

        for(var stat of data.spat.intersections[0].states){
          for(var color in colors){
            if(colors[color].indexOf(stat["state-time-speed"][0].eventState) != -1){

              // Changing the color of the lanes
              for(var lane_id of this.lane_groups[stat.signalGroup])
                this.lanes[lane_id].change_color(color, stat["state-time-speed"][0].timing.minEndTime, stat["state-time-speed"][0].timing.maxEndTime)

              break
            }
          }
        }

        // Updating the lanes sets the color
        for(var id in this.lanes)
          this.lanes[id].update()

      }).bind(this);

      this.active = true;
    }
  }
}

class Lane{
  constructor(id, ingress, coords, on_click){
    this.id = id
    this.situation_options = {
      "gray": {"paused":true, dashArray: [2,30], weight: 7, color: "#111111", pulseColor: "#FFFFFF"},
      "green": {"paused":false, "delay": 1000, dashArray: [2,30], weight: 7, color: "#00FF00", pulseColor: "#FFFFFF", reverse: ingress},
      "orange": {"paused":false, "delay": 1500, dashArray: [2,30], weight: 7, color: "#FF9900", pulseColor: "#FFFFFF", reverse: ingress},
      "red": {"paused":true, dashArray: [2,30], weight: 7, color: "#FF0000", pulseColor: "#FFFFFF"}
    }
    this.current_color = "gray"
    this.next_color = "gray"

    this.on_click = on_click

    // Create the ant line with the given coordinates
    this.latlngs = []
    for(var coord of coords)
      this.latlngs.push([ coord.delta["node-LatLon"].lat/10000000, coord.delta["node-LatLon"].lon/10000000 ])

    this.ant_line = new L.Polyline.AntPath(this.latlngs, this.situation_options.gray)
    this.ant_line.on('click', on_click)
    this.ant_line.on('mouseover', this.on_hover.bind(this))

    this.min_time = "?"
    this.max_time = "?"
  }

  add_to_map(map){
    this.map = map
    this.ant_line.addTo(map)
  }

  remove_from_map(){
    this.map.removeLayer(this.ant_line)
  }

  // The color gets stored, we only store the highest ranking color
  change_color(color, min_time, max_time){
    if(color_rank[color] > color_rank[this.next_color]){
      this.next_color = color
      this.min_time = min_time
      this.max_time = max_time
    }
  }

  on_hover(){

    console.log("hover")
    if(update_interval)
      clearInterval(update_interval)
    
    update_interval = setInterval((function(){
      var lane_status = document.getElementById("lane_status")
      lane_status.innerHTML = "This lane will change color in:<br> " + this.min_time + " - " + this.max_time 
    }).bind(this), 100)

    this.ant_line.on("mouseleave", this.on_stop_hover.bind(this))
  }

  on_stop_hover(){
    clearInterval(update_interval)
  }

  // Lanes only get the next color when updated
  update(){
    if(this.next_color !== this.current_color){
      this.remove_from_map()
      this.ant_line = new L.Polyline.AntPath(this.latlngs, this.situation_options[this.next_color])
      this.ant_line.on('click', this.on_click)
      this.ant_line.on('mouseover', this.on_hover.bind(this))
      this.add_to_map(this.map)

      this.current_color = this.next_color

      this.min_time = "?"
      this.max_time = "?"
    }

    this.next_color = "gray"
  }
}