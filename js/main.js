var pessoas_por_bola = 100;
var tamanho_pessoa = 0.20;
var raio = tamanho_pessoa*Math.sqrt(pessoas_por_bola);
var densidade = 0; //valor default
var max_tentativas = 5;
var map, spiner,area;
var poligonos = {};
var divisoes_paulista = [];
var circulos = [];
var poligonos_criados = 0;
var div = $(".tooltip");
var infos_divisao = {}
var traduz_id = {}
var infos_poligonos = {}

function acha_id(geojson) {
    return geojson.properties.description.split(" ").join("-")
}

function mostra_tooltip(e,d) {
    var event = e.originalEvent;
    if (d) {
        var html = "<p class=titulo_tooltip> Trecho "+d.properties.description+"</p>";
        var id_layer = acha_id(d);
    } else {
        var html = "<p class=titulo_tooltip> Trecho "+e.layer.feature.properties.description+"</p>";
        var id_layer = acha_id(e.layer.feature);
    }
    html += '<div id="slider-wrapper">' +
        '<input id=slider_'+ id_layer+' type="text" class=slider data-slider-min="0.1" data-slider-max="6" data-slider-step="0.1" data-slider-value="'+infos_divisao[id_layer]["densidade"]+'">' +
        '<span> Pessoas por m2: <span class=sliderval id="SliderVal_'+id_layer+'">'+infos_divisao[id_layer]["densidade"]+'</span></span>' +
        '</div>' +
        '<p class="texto" id="area_poligonos_'+ id_layer+'">Área desta divisão da Paulista: <span class="area_total">'+infos_divisao[id_layer]["area"]+'</span> m2</p><br/>' +
        '<p class="texto" id="texto_atualizacao_'+ id_layer+'">Pessoas existentes nesta area: <span class="colocadas" id="colocadas_'+id_layer+'">'+infos_divisao[id_layer]["pop"]+'</span></p>'

    div.html(html);
    div.show();
    div.css({
        opacity: 1,
        left: event.pageX - 15,
        top: event.pageY - 20
    });
    var este_slider = $("#slider_"+id_layer);
    este_slider.slider();
    este_slider.on("slide", function(slideEvt) {
        var valor = slideEvt.value;
        if (parseInt($("#SliderVal_"+id_layer).text()) != valor) {
            $("#SliderVal_"+id_layer).text(valor);
            infos_divisao[id_layer]["densidade"] = parseFloat(valor);
        }
    });
    este_slider.on("slideStop", function(event) {
        var target = document.getElementById('map-wrapper');
        spiner = new Spinner().spin(target);
        $("#map").css("opacity",0.7);
        setTimeout(function () {limpa_trecho(id_layer)},10);
        setTimeout(function () {atualiza_trecho(id_layer)},10);
    })
}

function style(feature) {
    if (feature.geometry.type == "Polygon") {
        return {
            color:"black",
            dashArray: '3'
        }
    }
}

function adiciona_area(id_desenhado) {
    var nome = $(id_desenhado).val();
    var poligono = $(id_desenhado).attr("id");
    var d = infos_poligonos[poligono][0];
    var marker = infos_poligonos[poligono][1];
    marker.closePopup();
    marker.unbindPopup();
    d.properties.description = nome;

    var area_aqui = parseInt(turf.area(d));

    divisoes_paulista.push([L.polygon(d["geometry"]["coordinates"]),d]);
    var id=acha_id(d);

    marker.on("click",function (e) {
        mostra_tooltip(e,d);
    })

    infos_divisao[id] = {}
    infos_divisao[id]["area"] = area_aqui;
    infos_divisao[id]["densidade"] = densidade;
    infos_divisao[id]["pop"] = 0;
    infos_divisao[id]["marcador"] = marker;

    traduz_id["poligono"+poligonos_criados] = id;

    area += area_aqui;
    $("#area_total").html(area);

}

function adiciona_draw() {
    var drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems
        },
        draw: {
            position: 'topleft',

            polyline: false,
            polygon: {
                allowIntersection: false, // Restricts shapes to simple polygons
                drawError: {
                    color: '#e1e100', // Color the shape will turn when intersects
                    message: '<strong>Ops!<strong> Tente desenhar um polígono fechado!', // Message that will show when intersect
                    showArea: true
                },
                shapeOptions: {
                    color:"black",
                    dashArray: '3'
                }
            },
            circle: false,
            marker: false,
            rectangle:false
        }
    });

    map.addControl(drawControl);

    map.on('draw:created', function (e) {
        poligonos_criados+= 1;
        var layer = e.layer;
        layer["id"] = "poligono"+poligonos_criados;
        var geojson = layer.toGeoJSON();
        var centroid = turf.centroid(geojson);
        var marker = L.marker([centroid["geometry"]["coordinates"][1],centroid["geometry"]["coordinates"][0]]).addTo(map);
        var opcoes = {
            "keepInView":true,
            "closeButton":false,
            "closeOnClick":false
        }
        marker.bindPopup('<input style=width:160px id=poligono'+poligonos_criados+" value='Dê um nome para esta área' ></input></br><button id=pronto onclick=adiciona_area(poligono"+poligonos_criados+")>Pronto</button>",opcoes).openPopup();

        infos_poligonos["poligono"+poligonos_criados] = [geojson,marker]
        drawnItems.addLayer(layer);
    });

    map.on('draw:deleted', function (e) {
        var layers = e.layers;
        layers.eachLayer(function (layer) {
            map.removeLayer(infos_divisao[traduz_id[layer["id"]]]["marcador"])

        });
    });

}

function cria_mapa() {
    map = new L.Map('map', {center: new L.LatLng(-23.562788, -46.654808), zoom: 17});
    var googleLayer = new L.Google('ROADMAP');
    map.addLayer(googleLayer);

    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    adiciona_draw();

    var paulista_geojson = {"type": "FeatureCollection", "features": [
        {"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[-46.663004,-23.55595],[-46.662865,-23.556083],[-46.662717,-23.556207],[-46.662669,-23.556284],[-46.66246,-23.556478],[-46.662272,-23.556638],[-46.662286,-23.556673],[-46.662329,-23.556705],[-46.662232,-23.556791],[-46.662178,-23.556744],[-46.662141,-23.556719],[-46.662063,-23.556769],[-46.661953,-23.556874],[-46.661696,-23.557086],[-46.661341,-23.557383],[-46.660422,-23.558212],[-46.660475,-23.558273],[-46.660429,-23.558315],[-46.66003,-23.557951],[-46.660078,-23.557912],[-46.660134,-23.557966],[-46.66095,-23.55727],[-46.660883,-23.557214],[-46.660995,-23.557128],[-46.66106,-23.557182],[-46.661548,-23.55671],[-46.661822,-23.556456],[-46.661712,-23.556341],[-46.661789,-23.55626],[-46.66191,-23.556353],[-46.662489,-23.555851],[-46.662701,-23.555662],[-46.663004,-23.55595]]]},"properties":{"name":"Trecho 1","description":"Até Augusta","timestamp":null,"begin":null,"_end":null,"altitudemode":null,"tessellate":-1,"extrude":-1,"visibility":-1,"draworder":null,"icon":null,"cartodb_id":1,"created_at":"2015-08-14T00:57:45Z","updated_at":"2015-08-14T00:57:45Z"}},
        {"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[-46.660429,-23.558315],[-46.660373,-23.558362],[-46.660293,-23.558295],[-46.659341,-23.559146],[-46.659311,-23.559173],[-46.65937,-23.55922],[-46.659311,-23.559274],[-46.659255,-23.55922],[-46.65918,-23.559291],[-46.659198,-23.559306],[-46.658962,-23.55951],[-46.658611,-23.559837],[-46.658233,-23.560162],[-46.658278,-23.560208],[-46.658171,-23.560311],[-46.658109,-23.560257],[-46.657514,-23.560786],[-46.65599,-23.562136],[-46.656036,-23.562175],[-46.656004,-23.562202],[-46.655709,-23.561919],[-46.655669,-23.561875],[-46.655642,-23.561851],[-46.656787,-23.560857],[-46.657624,-23.5601],[-46.657777,-23.55997],[-46.657696,-23.559894],[-46.657828,-23.559788],[-46.657927,-23.559867],[-46.658761,-23.559114],[-46.658787,-23.559092],[-46.658742,-23.559033],[-46.658809,-23.558994],[-46.658863,-23.559063],[-46.659322,-23.558635],[-46.659737,-23.558327],[-46.659695,-23.558291],[-46.660041,-23.557998],[-46.660003,-23.557969],[-46.66003,-23.557951],[-46.660429,-23.558315]]]},"properties":{"name":"Trecho 2","description":"Augusta até Alameda Casa Branda","timestamp":null,"begin":null,"_end":null,"altitudemode":null,"tessellate":-1,"extrude":-1,"visibility":-1,"draworder":null,"icon":null,"cartodb_id":2,"created_at":"2015-08-14T00:57:45Z","updated_at":"2015-08-14T00:57:45Z"}},
        {"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[-46.656004,-23.562202],[-46.65598,-23.562226],[-46.655942,-23.562165],[-46.654523,-23.563322],[-46.65396,-23.56379],[-46.654018,-23.563854],[-46.653902,-23.563956],[-46.653827,-23.563873],[-46.652722,-23.564793],[-46.652522,-23.564979],[-46.652524,-23.565052],[-46.652559,-23.565125],[-46.652504,-23.565166],[-46.652121,-23.564769],[-46.652168,-23.564738],[-46.652207,-23.564753],[-46.652268,-23.564703],[-46.652882,-23.564218],[-46.652858,-23.564178],[-46.653568,-23.563605],[-46.653564,-23.563568],[-46.653531,-23.56353],[-46.65359,-23.563478],[-46.653621,-23.563509],[-46.653658,-23.563519],[-46.653727,-23.563493],[-46.653747,-23.56347],[-46.653737,-23.563441],[-46.654199,-23.563073],[-46.654437,-23.562886],[-46.654708,-23.562667],[-46.654884,-23.562521],[-46.65486,-23.562491],[-46.65493,-23.562428],[-46.654966,-23.562405],[-46.655022,-23.562446],[-46.655093,-23.562388],[-46.655549,-23.562048],[-46.655681,-23.561949],[-46.655615,-23.56188],[-46.655642,-23.561851],[-46.656004,-23.562202]]]},"properties":{"name":"trecho 3 ","description":"Casa Branca - Campinas","timestamp":null,"begin":null,"_end":null,"altitudemode":null,"tessellate":-1,"extrude":-1,"visibility":-1,"draworder":null,"icon":null,"cartodb_id":3,"created_at":"2015-08-14T00:57:45Z","updated_at":"2015-08-14T00:57:45Z"}},
        {"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[-46.649156,-23.567862],[-46.648985,-23.567656],[-46.648893,-23.567427],[-46.648976,-23.567365],[-46.649022,-23.567415],[-46.64916,-23.567316],[-46.649513,-23.567038],[-46.649879,-23.566707],[-46.649835,-23.566663],[-46.650379,-23.566233],[-46.650424,-23.566244],[-46.650672,-23.566038],[-46.650626,-23.565996],[-46.650727,-23.565908],[-46.650786,-23.565954],[-46.650866,-23.565888],[-46.651002,-23.56577],[-46.651231,-23.565584],[-46.651282,-23.565547],[-46.651551,-23.565339],[-46.651496,-23.565272],[-46.652076,-23.564796],[-46.652121,-23.564769],[-46.652504,-23.565166],[-46.652441,-23.56521],[-46.652388,-23.56517],[-46.652044,-23.565443],[-46.651763,-23.565681],[-46.651341,-23.566024],[-46.651089,-23.566222],[-46.651079,-23.56626],[-46.651121,-23.566309],[-46.651007,-23.566399],[-46.650928,-23.56631],[-46.650625,-23.566561],[-46.650649,-23.566586],[-46.650257,-23.566908],[-46.649929,-23.567181],[-46.649948,-23.56721],[-46.649489,-23.567583],[-46.649226,-23.567793],[-46.649156,-23.567862]]]},"properties":{"name":"trecho 4 ","description":"Campinas - Brigadeiro","timestamp":null,"begin":null,"_end":null,"altitudemode":null,"tessellate":-1,"extrude":-1,"visibility":-1,"draworder":null,"icon":null,"created_at":"2015-08-14T00:57:53Z","updated_at":"2015-08-14T00:57:53Z","cartodb_id":1}},
        {"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[-46.649156,-23.567862],[-46.649097,-23.567903],[-46.649021,-23.567816],[-46.648821,-23.567959],[-46.648848,-23.56803],[-46.648242,-23.568496],[-46.647727,-23.568893],[-46.647559,-23.569027],[-46.647579,-23.569092],[-46.647609,-23.569121],[-46.647552,-23.569167],[-46.647497,-23.569106],[-46.647441,-23.569107],[-46.647414,-23.569155],[-46.646888,-23.569554],[-46.646714,-23.569695],[-46.646713,-23.569729],[-46.646738,-23.569755],[-46.646625,-23.569832],[-46.646596,-23.569814],[-46.646556,-23.569815],[-46.646424,-23.569916],[-46.646088,-23.570174],[-46.645799,-23.570403],[-46.645795,-23.57042],[-46.645818,-23.570446],[-46.645744,-23.570498],[-46.645679,-23.570437],[-46.645546,-23.570536],[-46.645425,-23.570631],[-46.64544,-23.570663],[-46.645172,-23.57085],[-46.644875,-23.571077],[-46.644631,-23.571268],[-46.644311,-23.571512],[-46.644273,-23.571469],[-46.644048,-23.571637],[-46.643965,-23.571712],[-46.643749,-23.571565],[-46.644141,-23.571248],[-46.644061,-23.571182],[-46.644022,-23.571152],[-46.644098,-23.571096],[-46.644165,-23.571154],[-46.644228,-23.571151],[-46.644485,-23.570965],[-46.644413,-23.570889],[-46.644786,-23.570629],[-46.644971,-23.570471],[-46.64496,-23.570441],[-46.645331,-23.570184],[-46.645652,-23.569933],[-46.646242,-23.569515],[-46.646271,-23.569487],[-46.64623,-23.569417],[-46.646347,-23.569334],[-46.646389,-23.569383],[-46.646614,-23.56921],[-46.646973,-23.568966],[-46.64717,-23.568826],[-46.647174,-23.568785],[-46.64714,-23.568742],[-46.647216,-23.568695],[-46.647276,-23.568766],[-46.64735,-23.568769],[-46.647462,-23.568689],[-46.647414,-23.568639],[-46.647963,-23.568205],[-46.648377,-23.567932],[-46.648356,-23.567867],[-46.648734,-23.567626],[-46.64884,-23.567557],[-46.648817,-23.567465],[-46.648893,-23.567427],[-46.648985,-23.567656],[-46.649156,-23.567862]]]},"properties":{"name":"Trecho 5","description":"Brigadeiro - Praça Oswaldo Cruz","timestamp":null,"begin":null,"_end":null,"altitudemode":null,"tessellate":-1,"extrude":-1,"visibility":-1,"draworder":null,"icon":null,"created_at":"2015-08-14T00:57:53Z","updated_at":"2015-08-14T00:57:53Z","cartodb_id":2}}
    ]};

    var camada = new L.geoJson();
    drawnItems.addLayer(camada);
    map.on("click", function () {
        div.hide()
    });

    paulista_geojson.features.forEach(function (d) {
        var teste = camada.addData(d);
        teste.setStyle(style)
        divisoes_paulista.push([L.polygon(d["geometry"]["coordinates"]),d]);
        var id=acha_id(d);
        var area_aqui = parseInt(turf.area(d));
        var centroid = turf.centroid(d);
        var marker = L.marker([centroid["geometry"]["coordinates"][1],centroid["geometry"]["coordinates"][0]]).addTo(map);

        marker.on("click",function (e) {
            mostra_tooltip(e,d);
        })

        if (id == "Casa") {
            marker.bindPopup("Clique no balãozinho de cada trecho da Paulista para adicionar manifestantes").openPopup();
            marker.unbindPopup()
        }

        infos_divisao[id] = {}
        infos_divisao[id]["area"] = area_aqui;
        infos_divisao[id]["densidade"] = densidade;
        infos_divisao[id]["pop"] = 0;
        infos_divisao[id]["marcador"] = marker;


    });

    area = parseInt(turf.area(paulista_geojson));
    $("#area_total").html(area);
}


function atualiza_trecho(id_layer) {
    var colocados = 0;
    var j = 0;

    divisoes_paulista.forEach(function (item) {
        var id = acha_id(item[1]);
        if (id == id_layer) {

            var multidao_aqui = infos_divisao[id]["area"]*infos_divisao[id]["densidade"];

            var pontos_por_divisao = (multidao_aqui/pessoas_por_bola);

            var pedaco_paulista = item[0];
            poligonos[id_layer] = [];
            var contador = 0;
            var bbox = [pedaco_paulista.getBounds()["_southWest"]["lng"],
                pedaco_paulista.getBounds()["_southWest"]["lat"],
                pedaco_paulista.getBounds()["_northEast"]["lng"],
                pedaco_paulista.getBounds()["_northEast"]["lat"]];

            var poligono_para_testar = pedaco_paulista.toGeoJSON();

            var tentativas = 0;
            while (contador < pontos_por_divisao) {
                if (tentativas > max_tentativas) break;
                tentativas += 1;
                var pontos = turf.random('points', pontos_por_divisao*2, {
                    bbox: bbox
                });

                pontos["features"].forEach(function (d) {

                    if (turf.inside(d, poligono_para_testar)) {
                        var ta_sozinho = true;

                        poligonos[id_layer].forEach(function (e) {
                            if (ta_dentro(d, e[0])) {
                                ta_sozinho = false;
                            }
                        })

                        if (ta_sozinho) {
                            var circulo = L.circle(d["geometry"]["coordinates"], raio, {
                                color: 'darkred',
                                fillColor: '#f03',
                                fillOpacity: 0.7
                            }).addTo(map);
                            contador += 1;
                            poligonos[id_layer].push([d,circulo]);
                        }
                    }
                });
            }
            infos_divisao[id]["pop"] = contador*pessoas_por_bola;
            colocados += contador;
            j += 1;
        }
    });

    var total_pessoas = 0;
    for (var trecho in infos_divisao) {
        total_pessoas += infos_divisao[trecho]["pop"]
    }

    $("#colocadas_"+id_layer).html(infos_divisao[id_layer]["pop"])
    $("#densidade").html(parseInt(total_pessoas*10/area)/10);
    $("#colocadas").html(parseInt(total_pessoas));
    spiner.stop();
    $("#map").css("opacity",1)
}

function limpa_trecho(id_layer) {
    if (poligonos[id_layer])
        poligonos[id_layer].forEach(function (d) {
            map.removeLayer(d[1])
        })
}

function ta_dentro(poligono_1,poligono_2) {
    return turf.distance(poligono_1,poligono_2,"kilometers") < (raio/1000);
}

function iniciar() {
    cria_mapa();
}

iniciar();