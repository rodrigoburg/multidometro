var divisoes_paulista = 80;
var multidao = 50000;
var raio_pessoa = 0.2;
var raio = 2;
var pontos_por_divisao = (multidao/(raio/raio_pessoa))/divisoes_paulista;
var max_tentativas = 15;
var map, paulista, poligono,bbox,dist_lat,dist_long;
var poligonos = {};
var circulos = [];

function cria_mapa() {
    map = new L.Map('map', {center: new L.LatLng(-23.562788, -46.654808), zoom: 18});
    var googleLayer = new L.Google('ROADMAP');
    map.addLayer(googleLayer);


    poligono = [
        [-23.55569, -46.66269],
        [-23.55594, -46.66305],
        [-23.57139, -46.64434],
        [-23.57124, -46.64416]];

    paulista = L.polygon(poligono).addTo(map);

    //L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    // id: 'teste',
    // attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'}).addTo(map);

    //CALCULAR AREA DO POLIGONO
    poligono.push(poligono[0])
    poligono = turf.polygon([poligono])
    console.log(turf.area(poligono))

    bbox = [paulista.getBounds()["_northEast"]["lat"],
        paulista.getBounds()["_northEast"]["lng"],
        paulista.getBounds()["_southWest"]["lat"],
        paulista.getBounds()["_southWest"]["lng"]];

    dist_lat = (bbox[0]-bbox[2])/divisoes_paulista
    dist_long = (bbox[1]-bbox[3])/divisoes_paulista

}


function cria_poligonos() {
    var colocados = 0;
    for (j = 0;j<divisoes_paulista;j++) {
        poligonos[j] = [];
        var contador = 0;
        var tentativas = 0;
        var new_bbox = [
                bbox[0]-(j*dist_lat),
                bbox[3]+(j*dist_long),
                bbox[0]-((j+2)*dist_lat),
                bbox[3]+((j+2)*dist_long)]

        while (contador < pontos_por_divisao) {
            if (tentativas > max_tentativas) break;
            tentativas += 1;

            var pontos = turf.random('points', pontos_por_divisao*2, {
                bbox: new_bbox
            });

            //L.polygon(turf.bboxPolygon(new_bbox)["geometry"]["coordinates"]).addTo(map)

            pontos["features"].forEach(function (d) {
                if (turf.inside(d,poligono)) {
                    var ta_sozinho = true;

                    poligonos[j].forEach(function (e) {
                        if (ta_dentro(d,e)) {
                            ta_sozinho = false;
                        }
                    })

                    if (j > 0) {
                        poligonos[j-1].forEach(function (e) {
                            if (ta_dentro(d,e)) {
                                ta_sozinho = false;
                            }
                        })
                    }

                    if (ta_sozinho) {
                        var circulo = L.circle(d["geometry"]["coordinates"], raio, {
                            color: 'red',
                            fillColor: '#f03',
                            fillOpacity: 0.7
                        }).addTo(map);
                        contador += 1;
                        poligonos[j].push(d);
                        circulos.push(circulo)
                    }
                }
            });
        }
        colocados += contador;

    }
    $("#colocadas").html(colocados*(raio/raio_pessoa));
    console.log("COLOCADOS: "+colocados*(raio/raio_pessoa) +" PESSOAS");

}

function limpa_mapa() {
    circulos.forEach(function (d) {
        map.removeLayer(d)
    })
}

function ta_dentro(poligono_1,poligono_2) {
    return turf.distance(poligono_1,poligono_2,"kilometers") < (raio/1000);
}

function pega_valores() {
    var val_mutidao = $("#multidao").val();
    var val_raio_pessoa = $("#gordura").val();
    var val_raio = $("#bola").val();
    if (val_mutidao) multidao = parseFloat(val_mutidao);
    if (val_raio_pessoa) raio_pessoa = parseFloat(val_raio_pessoa/100);
    if (val_raio) raio = parseFloat(val_raio)*raio_pessoa;
}

function iniciar() {
    cria_mapa();
    cria_poligonos();
}


//inicia o menu
$('#atualizar').on('click', function () {
    limpa_mapa();
    pega_valores();
    cria_poligonos();
})


iniciar();