/*global $, L*/
/*jslint browser: true */

$(document).on('mobileinit', function () {
    'use strict';
    $.mobile.pushStateEnabled = false;
});

Number.prototype.toRad = function () {
    'use strict';
    return this * Math.PI / 180;
};

var myCoord, from, to, goodIcon = '16px-Gnome-emblem-default.svg.png', badIcon = '16px-Gnome-process-stop.svg.png', maxDist = 1000, goodMessage = '', badMessage = '';


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
        parkings.push({dist: dist});
    }
    parkings.sort(sortDists);
    quality = getQuality(parkings[0].dist);
    $('#autotrement2').empty().removeAttr('class').addClass(quality).append('<img src="' + window[quality + 'Icon'] + '" alt="" class="ui-li-icon" />' + window[quality + 'Message'] + '<span class="ui-li-count">' + parkings[0].dist + ' m</span>');
    $('#resultsList').listview('refresh');
};

var autotrement = function (nodes) {
    'use strict';
    var points = nodes.getElementsByTagNameNS('http://ogr.maptools.org/', 'poi_autotrement'), coord, name, dist, i, stations = [], quality;
    goodMessage = 'Station à moins de ' + maxDist + ' m';
    badMessage = 'Station à plus de ' + maxDist + ' m';
    for (i = 0; i < points.length; i += 1) {
        coord = points.item(i).getElementsByTagNameNS('http://www.opengis.net/gml', 'coordinates')[0].textContent;
        name = points.item(i).getElementsByTagNameNS('http://ogr.maptools.org/', 'libelle')[0].textContent;
        coord = coord.split(',');
        coord = {latitude: parseFloat(coord[1]), longitude: parseFloat(coord[0])};
        dist = Math.round(getDist(from, coord) * 1000);
        stations.push({dist: dist, name: name});
    }
    stations.sort(sortDists);
    quality = getQuality(stations[0].dist);
    $('#autotrement').empty().removeAttr('class').addClass(quality).append('<img src="' + window[quality + 'Icon'] + '" alt="" class="ui-li-icon" />' + window[quality + 'Message'] + '&nbsp;: ' + stations[0].name + '<span class="ui-li-count">' + stations[0].dist + ' m</span>');
    $('#resultsList').listview('refresh');
    $.get('parking.xml', null, parking);
};


var velhop = function (stations) {
    'use strict';
    var velhop = [], quality;
    goodMessage = 'Station à moins de ' + maxDist + ' m';
    badMessage = 'Station à plus de ' + maxDist + ' m';
    stations.forEach(function (value) {
        var coord = {latitude: parseFloat(value.lat), longitude: parseFloat(value.long)}, dist = Math.round(getDist(from, coord) * 1000);
        velhop.push({dist: dist, name: value.name, max: value.max, current: value.current});
    });
    velhop.sort(sortDists);
    quality = getQuality(velhop[0].dist);
    $('#velhop').empty().removeAttr('class').addClass(quality).append('<img src="' + window[quality + 'Icon'] + '" alt="" class="ui-li-icon" />' + window[quality + 'Message'] + '&nbsp;: ' + velhop[0].name + ' (' + velhop[0].current + ' vélos disponibles)' + '<span class="ui-li-count">' + velhop[0].dist + ' m</span>');
    $('#velhop2').empty().removeAttr('class').addClass('good').append('<img src="' + goodIcon + '" alt="" class="ui-li-icon" />' + 'Le campus est équipé d\'arceaux à vélo');
    $('#resultsList').listview('refresh');
};

var ajax = function (url, handler) {
    'use strict';
    var client = new XMLHttpRequest();
    client.onreadystatechange = handler;
    client.open('GET', url);
    client.send();
};

var geoloc = function (position) {
    'use strict';
    myCoord = position.coords;
    $('#curpos').text(position.coords.latitude + ',' + position.coords.longitude);
    $('#usepos').checkboxradio('enable');
};

var noloc = function () {
    'use strict';
    $('#curpos').text('introuvable');
};


var getDest = function (data) {
    'use strict';
    var places = data.getElementsByTagName('Placemark'), i;
    for (i = 0; i < places.length; i += 1) {
        $('<option>' + places.item(i).getElementsByTagName('name')[0].textContent + '</option>').appendTo('#destinations').val(places.item(i).getElementsByTagName('coordinates')[0].textContent);
    }
    $('#destinations').selectmenu('refresh');
};

var search = function (event) {
    'use strict';
    event.preventDefault();
    if ($('#usepos').prop('checked') && myCoord) {
        from = myCoord;
        to = $('#destinations').val();
        to = to.split(',');
        to = {latitude: parseFloat(to[1]), longitude: parseFloat(to[0])};
        $.mobile.changePage($('#results'));
        $.get('autotrement.xml', null, autotrement);
        $.getJSON('https://strasweb.fr/velhop/getJSON.php', null, velhop);
    } else {
        //$.mobile.changePage($('#choosepos'), {changeHash: false});
        $('#noloc').popup();
        $('#noloc').popup('open');
    }
};

var gotoSearch = function () {
    'use strict';
    $.mobile.changePage($('#home'));
};

var initMap = function () {
    'use strict';
    // create a map in the "map" div, set the view to a given place and zoom
    var map = L.map('leaflet').setView([51.505, -0.09], 13);

    // add an OpenStreetMap tile layer
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // add a marker in the given location, attach some popup content to it and open the popup
    L.marker([51.5, -0.09]).addTo(map)
        .bindPopup('A pretty CSS3 popup. <br> Easily customizable.')
        .openPopup();
    $('#map').unbind('pageshow', initMap);
};

var init = function () {
    'use strict';
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(geoloc, noloc);
    } else {
        noloc();
    }
    $.get('coordUDS.kml', null, getDest);
    $('#search').click(search);
    $('#map').bind('pageshow', null, initMap);
};

var initPhone = function () {
    'use strict';
    $(document).bind('searchbutton', null, gotoSearch);
};

$(document).bind('ready', null, init);
$(document).bind('deviceready', null, initPhone);
