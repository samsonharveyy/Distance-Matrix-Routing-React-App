import { useRef, useEffect, useState } from 'react';
import './App.css';

import * as tt from '@tomtom-international/web-sdk-maps';
import * as tt_services from '@tomtom-international/web-sdk-services';
import '@tomtom-international/web-sdk-maps/dist/maps.css'

const App = () => {
  const mapElement = useRef();
  const [map, setMap] = useState({});
  const [longitude, setLongitude] = useState(120.9842);
  const [latitude, setLatitude] = useState(14.5995);
  
  const convertToPoints = (lngLat) => {
    return{
      point: {
        latitude: lngLat.lat,
        longitude: lngLat.lng,
      }
    }
  }

  const drawRoute = (geoJson, map) => {
    if (map.getLayer('route')){
      map.removeLayer('route');
      map.removeSource('route');
    }
    map.addLayer({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: geoJson,
      },
      paint: {
        'line-color': '#185176',
        'line-width': 5,
      }
    })
  }

  const addDestMarker = (lngLat, map) => {
    const element = document.createElement('div');
    element.className = 'dest-marker';
    new tt.Marker({
      element: element
    })
    .setLngLat(lngLat)
    .addTo(map)
  }

  useEffect(() => {
    const origin = {
      lng: longitude,
      lat: latitude,
    }
    const destinations = [];

    let map = tt.map({
      key: process.env.REACT_APP_TOMTOM_API_KEY,
      container:mapElement.current,
      center: [longitude, latitude],
      zoom: 13,
      stylesVisibility:{
        trafficIncidents: true,
        trafficFlow: true,
      }
    });

    setMap(map);

    const putMarker = () => {
      const popupOffset = {
        bottom: [0, -25]
        
      }
      const popup = new tt.Popup({
        offset: popupOffset
      }).setHTML('You are here')

      const element = document.createElement('div');
      element.className = 'marker';

      const marker = new tt.Marker({
        draggable: true,
        element: element,
      }).setLngLat([longitude, latitude])
        .addTo(map)

        marker.on('dragend', () =>{
          const lngLat = marker.getLngLat();
          setLongitude(lngLat.lng);
          setLatitude(lngLat.lat);
        })

        marker.setPopup(popup).togglePopup();
    }
    putMarker();

    const sortDestinations = (locations) => {
      const destinationPoints = locations.map((dest) => {
        return convertToPoints(dest);
      })
      const callParameters = {
        key: process.env.REACT_APP_TOMTOM_API_KEY,
        destinations: destinationPoints,
        origins: [convertToPoints(origin)],
      }
      return new Promise((resolve, reject) => {
        tt_services.services
          .matrixRouting(callParameters)
        .then((matrixAPIResults)=>{
          const results = matrixAPIResults.matrix[0];
          const resultsArray = results.map((result, index)=>{
            return{
              location: locations[index],
              drivingtime: result.response.routeSummary.travelTimeInSeconds,
            }
          })
          resultsArray.sort((a,b)=>{
            return a.drivingtime - b.drivingtime
          })
          const sortedLocs = resultsArray.map((result)=>{
            return result.location
          }) 
          resolve(sortedLocs);
        })
      })
    }

    const recalculateRoutes = () => {
      sortDestinations(destinations).then((sorted)=>{
        sorted.unshift(origin);

        tt_services.services
          .calculateRoute({
            key: process.env.REACT_APP_TOMTOM_API_KEY,
            locations: sorted, 
          })
          .then((routeData)=>{
            const geoJson = routeData.toGeoJson();
            drawRoute(geoJson, map);
          })
      })
    }


    map.on('click', (e) => {
      destinations.push(e.lngLat);
      addDestMarker(e.lngLat, map);
      recalculateRoutes();
    })

    return () => map.remove();

    
  }, [longitude, latitude])

  return (
    <>
    {map && (
    <div className="app">
      <div ref={mapElement} className="map"></div>
      <div className="search-bar">
        <h3>Set Location</h3>
        <input 
        type = "text"
        id = "longitude"
        className = "longitude"
        placeholder="Input longitude"
        onChange={(e) => {setLongitude(e.target.value)}}
        />
        <input 
        type = "text"
        id = "latitude"
        className = "latitude"
        placeholder="Input latitude"
        onChange={(e) => {setLatitude(e.target.value)}}
        />
      </div>
    </div>
    )}
    </>
  );
}

export default App;
