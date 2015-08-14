var divisoes_paulista = 80;
var pessoas_por_bola = 30;
var tamanho_pessoa = 0.20;
var raio = tamanho_pessoa*Math.sqrt(pessoas_por_bola);
var max_tentativas = 15;
var densidade = 3;
var map, paulista, poligono,bbox,dist_lat,dist_long,area;
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
    poligono.push(poligono[0]);
    poligono = turf.polygon([poligono]);
    area = parseInt(turf.area(poligono));
    $("#area_total").html(area);

    bbox = [paulista.getBounds()["_northEast"]["lat"],
        paulista.getBounds()["_northEast"]["lng"],
        paulista.getBounds()["_southWest"]["lat"],
        paulista.getBounds()["_southWest"]["lng"]];

    dist_lat = (bbox[0]-bbox[2])/divisoes_paulista;
    dist_long = (bbox[1]-bbox[3])/divisoes_paulista;

}


function cria_poligonos() {
    var colocados = 0;
    var multidao = area*densidade;
    var pontos_por_divisao = (multidao/pessoas_por_bola)/divisoes_paulista;
    for (j = 0;j<divisoes_paulista;j++) {
        if (colocados*pessoas_por_bola > multidao) break
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
                            color: 'darkred',
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
    $("#colocadas").html(parseInt(colocados*pessoas_por_bola));

}

function limpa_mapa() {
    circulos.forEach(function (d) {
        map.removeLayer(d)
    })
}

function ta_dentro(poligono_1,poligono_2) {
    return turf.distance(poligono_1,poligono_2,"kilometers") < (raio/1000);
}

function iniciar() {
    cria_mapa();
}


//inicia o menu
$('#atualizar').on('click', function () {
    limpa_mapa();
    cria_poligonos();
})

var slider = $("#slider");
slider.slider()
slider.on("slide", function(slideEvt) {
    var valor = slideEvt.value
    if (parseInt($("#SliderVal").text()) != valor) {
        $("#SliderVal").text(valor);
        densidade = parseInt(valor);
    }
});


iniciar();