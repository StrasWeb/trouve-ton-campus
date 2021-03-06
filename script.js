/*global $, L*/
/*jslint browser: true */

/*
 * © 2013 StrasWeb
 * 
 * This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
    * */

Number.prototype.toRad = function () {
    'use strict';
    return this * Math.PI / 180;
};

var myCoord, from, to, goodIcon = '16px-Gnome-emblem-default.svg.png', badIcon = '16px-Gnome-process-stop.svg.png', maxDist = 1000, goodMessage = '', badMessage = '', map, markers, myParking;


var getDist = function (coord1, coord2) {
    'use strict';
    var lat1, lat2, R, dLat, dLon, a, c;
    R = 6371; // km
    dLat = (coord2.latitude - coord1.latitude).toRad();
    dLon = (coord2.longitude - coord1.longitude).toRad();
    lat1 = coord1.latitude.toRad();
    lat2 = coord2.latitude.toRad();

    a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};


var sortDists = function (a, b) {
    'use strict';
    if (a.dist < b.dist) {
        return -1;
    }
    if (a.dist > b.dist) {
        return 1;
    }
    return 0;
};

var getQuality = function (dist) {
    'use strict';
    return dist > maxDist ? 'bad' : 'good';
};

var initMap = function (e) {
    'use strict';
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {attribution: '&copy; <a target="_blank" href="http://osm.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    $('#map').unbind('pageshow', initMap);
    markers.clearLayers();
    e.data.forEach(function (value) {
        if (value.name) {
            if (value.dest) {
                markers.addLayer(L.marker([value.latitude, value.longitude], {icon: new L.icon({iconUrl: 'pin1.png', popupAnchor: [0.5, -26], iconAnchor: [14, 38]})}).bindPopup(value.name));
            } else {
                markers.addLayer(L.marker([value.latitude, value.longitude]).bindPopup(value.name));
            }
        } else {
            markers.addLayer(L.circle([value.latitude, value.longitude], value.accuracy).bindPopup('Votre position'));
        }
    });
    markers.addTo(map);
    map.fitBounds(markers.getBounds());
};

//Pour les moyens de transport où le parking est pertinent
var initMapParking = function (e) {
    'use strict';
    initMap(e);
    markers.addLayer(L.marker([myParking.latitude, myParking.longitude]).bindPopup('Parking public'));
};

var showmap = function (e) {
    'use strict';
    if (e.currentTarget.id === 'automap') {
        $('#map').bind('pageshow', e.data, initMapParking);
    } else {
        $('#map').bind('pageshow', e.data, initMap);
    }
};

var parking = function (data) {
    'use strict';
    var places = data.getElementsByTagName('coordinates'), i, coord, dist, parkings = [], quality;
    goodMessage = "Parking public proche de l'établissement";
    badMessage = "Pas de parking public proche de l'établissement";
    for (i = 0; i < places.length; i += 1) {
        coord = places.item(i).textContent;
        coord = coord.split(',');
        coord = {latitude: parseFloat(coord[1]), longitude: parseFloat(coord[0])};
        dist = Math.round(getDist(to, coord) * 1000);
        parkings.push({dist: dist, coord: coord});
    }
    parkings.sort(sortDists);
    quality = getQuality(parkings[0].dist);
    $('#autotrement2').empty().removeAttr('class').addClass(quality).append('<img src="' + window[quality + 'Icon'] + '" alt="" class="ui-li-icon" />' + window[quality + 'Message'] + '<span class="ui-li-count">' + parkings[0].dist + ' m</span>');
    $('#resultsList').listview('refresh');
    myParking = parkings[0].coord;
};

var autotrement = function (nodes) {
    'use strict';
    var points = nodes.getElementsByTagNameNS('http://ogr.maptools.org/', 'poi_autotrement'), coord, name, dist, i, stations = [], quality, coords = [];
    goodMessage = 'Station à moins de ' + maxDist + ' m';
    badMessage = 'Station à plus de ' + maxDist + ' m';
    for (i = 0; i < points.length; i += 1) {
        coord = points.item(i).getElementsByTagNameNS('http://www.opengis.net/gml', 'coordinates')[0].textContent;
        name = points.item(i).getElementsByTagNameNS('http://ogr.maptools.org/', 'libelle')[0].textContent;
        coord = coord.split(',');
        coord = {latitude: parseFloat(coord[1]), longitude: parseFloat(coord[0])};
        dist = Math.round(getDist(from, coord) * 1000);
        stations.push({dist: dist, name: name, coord: coord});
    }
    stations.sort(sortDists);
    quality = getQuality(stations[0].dist);
    $('#autotrement').empty().removeAttr('class').addClass(quality).append('<img src="' + window[quality + 'Icon'] + '" alt="" class="ui-li-icon" />' + window[quality + 'Message'] + '&nbsp;: ' + stations[0].name + '<span class="ui-li-count">' + stations[0].dist + ' m</span>');
    stations[0].coord.name = stations[0].name;
    coords.push(from, stations[0].coord, to);
    $('#automap').bind('click', coords, showmap);
    $('#resultsList').listview('refresh');
    $.get('parking.xml', null, parking);
};


var tram = function (nodes) {
    'use strict';
    var points = nodes.getElementsByTagName('Placemark'), coord, name, dist, i, stations = [], quality, coords = [], line;
    //Départ
    goodMessage = 'Station à moins de ' + maxDist + ' m';
    badMessage = 'Station à plus de ' + maxDist + ' m';
    for (i = 0; i < points.length; i += 1) {
        coord = points.item(i).getElementsByTagName('coordinates')[0].textContent;
        name = points.item(i).getElementsByTagName('name')[0].textContent;
        coord = coord.split(',');
        coord = {latitude: parseFloat(coord[1]), longitude: parseFloat(coord[0])};
        dist = Math.round(getDist(from, coord) * 1000);
        stations.push({dist: dist, name: name, coord: coord});
    }
    stations.sort(sortDists);
    quality = getQuality(stations[0].dist);
    line = stations[0].line ? ' (ligne ' + stations[0].line[1] + ')' : '';
    $('#tram1').empty().removeAttr('class').addClass(quality).append('<img src="' + window[quality + 'Icon'] + '" alt="" class="ui-li-icon" />' + window[quality + 'Message'] + '&nbsp;: ' + stations[0].name + '<span class="ui-li-count">' + stations[0].dist + ' m</span>');
    stations[0].coord.name = stations[0].name;
    coords.push(stations[0].coord);
    //Arrivée
    line = stations[0].line;
    stations = [];
    goodMessage = "Station proche de l'établissement";
    badMessage = "Pas de station proche de l'établissement";
    for (i = 0; i < points.length; i += 1) {
        coord = points.item(i).getElementsByTagName('coordinates')[0].textContent;
        name = points.item(i).getElementsByTagName('name')[0].textContent;
        coord = coord.split(',');
        coord = {latitude: parseFloat(coord[1]), longitude: parseFloat(coord[0])};
        dist = Math.round(getDist(to, coord) * 1000);
        stations.push({dist: dist, name: name, coord: coord});
    }
    stations.sort(sortDists);
    quality = getQuality(stations[0].dist);
    $('#tram2').empty().removeAttr('class').addClass(quality).append('<img src="' + window[quality + 'Icon'] + '" alt="" class="ui-li-icon" />' + window[quality + 'Message'] + '&nbsp;: ' + stations[0].name + '<span class="ui-li-count">' + stations[0].dist + ' m</span>');
    stations[0].coord.name = stations[0].name;
    coords.push(from, stations[0].coord, to);
    $('#trammap').bind('click', coords, showmap);
    $('#resultsList').listview('refresh');
};




var velhop = function (stations) {
    'use strict';
    var velhop = [], quality, coords = [];
    goodMessage = 'Station à moins de ' + maxDist + ' m';
    badMessage = 'Station à plus de ' + maxDist + ' m';
    stations.forEach(function (value) {
        var coord = {latitude: parseFloat(value.lat), longitude: parseFloat(value.long)}, dist = Math.round(getDist(from, coord) * 1000);
        velhop.push({dist: dist, name: value.name, max: value.max, current: value.current, coord: coord});
    });
    velhop.sort(sortDists);
    quality = getQuality(velhop[0].dist);
    $('#velhop').empty().removeAttr('class').addClass(quality).append('<img src="' + window[quality + 'Icon'] + '" alt="" class="ui-li-icon" />' + window[quality + 'Message'] + '&nbsp;: ' + velhop[0].name + ' (' + velhop[0].current + ' vélos disponibles)' + '<span class="ui-li-count">' + velhop[0].dist + ' m</span>');
    $('#velhop2').empty().removeAttr('class').addClass('good').append('<img src="' + goodIcon + '" alt="" class="ui-li-icon" />' + 'Le campus est équipé d\'arceaux à vélo');
    velhop[0].coord.name = velhop[0].name;
    coords.push(from, velhop[0].coord, to);
    $('#velhopmap').bind('click', coords, showmap);
    $('#resultsList').listview('refresh');
};

var geoloc = function (position) {
    'use strict';
    myCoord = position.coords;
    $('#curpos').text(position.coords.latitude + ',' + position.coords.longitude);
};


var noloc = function () {
    'use strict';
    $('#curpos').text('introuvable');
};

var reloc = function () {
    'use strict';
    $('#curpos').text('…');
    navigator.geolocation.getCurrentPosition(geoloc, noloc);
    return false;
};


var getDest = function (data) {
    'use strict';
    var places = data.getElementsByTagName('Placemark'), i;
    for (i = 0; i < places.length; i += 1) {
        $('<option>' + places.item(i).getElementsByTagName('name')[0].textContent + '</option>').appendTo('#destinations').val(places.item(i).getElementsByTagName('coordinates')[0].textContent);
    }
    $('#destinations').selectmenu('refresh');
};

var results = function () {
    'use strict';
    $.mobile.changePage($('#results'));
};

var nofrom = function () {
    'use strict';
    if (navigator.notification) {
        navigator.notification.alert('Impossible de déterminer votre position !', function () {});
    } else {
        $('#noloc').popup();
        $('#noloc').popup('open');
        $('#noloc').removeClass('hidden');
    }
};

var search = function () {
    'use strict';
    if (($('#usepos').prop('checked') && myCoord) || ($('#searchpos').prop('checked') && $('#searchfield').val())) {
        to = $('#destinations').val();
        to = to.split(',');
        to = {latitude: parseFloat(to[1]), longitude: parseFloat(to[0]), name: $('#destinations option:selected').text()};
        to.dest = true;
        if ($('#usepos').prop('checked')) {
            from = myCoord;
            results();
        } else if ($('#searchpos').prop('checked')) {
            $.getJSON('http://nominatim.openstreetmap.org/search/?format=json&limit=1&countrycodes=fr&email=contact@strasweb.fr&q=' + $('#searchfield').val(), null, function (data) {
                if (data[0]) {
                    data = data[0];
                    from = {latitude: parseFloat(data.lat), longitude: parseFloat(data.lon), accuracy: getDist({latitude: parseFloat(data.boundingbox[0]), longitude: parseFloat(data.boundingbox[2])}, {latitude: parseFloat(data.lat), longitude: parseFloat(data.lon)}) * 1000};
                    results();
                } else {
                    nofrom();
                }
            });
        }
    } else {
        nofrom();
    }
    return false;
};

var home = function () {
    'use strict';
    $.mobile.changePage($('#home'));
};

var init = function () {
    'use strict';
    map = new L.map('leaflet');
    map.attributionControl.setPrefix('');
    markers = new L.FeatureGroup();
    home();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(geoloc, noloc);
    } else {
        noloc();
    }
    $.get('coordUDS.kml', null, getDest);
    $('#search').bind('click', search);
    $('#reloc').bind('vclick', reloc);
    $('#noloc').bind('popupafterclose', null, function () {
        $('#noloc').addClass('hidden');
    });
    if ($('#searchpos').prop('checked')) {
        $('#searchfield').textinput('enable');
    }
    $('#searchpos').bind('click', function () {
        $('#searchfield').textinput('enable');
    });
    $('#usepos').bind('click', function () {
        $('#searchfield').textinput('disable');
    });
    $('#results').bind('pagebeforeshow', function () {
        $.get('autotrement.xml', null, autotrement);
        $.get('tram.kml', null, tram);
        $.getJSON('https://strasweb.fr/velhop/getJSON.php', null, velhop);
    });
};

var initPhone = function () {
    'use strict';
    $(document).bind('searchbutton', null, home);
};

$(document).bind('ready', null, init);
$(document).bind('deviceready', null, initPhone);
