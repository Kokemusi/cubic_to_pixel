import * as Three from "three/webgpu";
import * as bufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import * as KS from "key_stats";
import * as TH from "ThreeHandler";
import * as MM from "MapMesh";
import * as PV from "Preview";

//変数とか宣言
let map = {version:"0628"};
let editingPart = undefined;
let pen = {
    target:undefined,
    get color(){return new Three.Color(document.getElementById("input_pen_color").value)},
    get mode(){return document.querySelector("input[name = 'pen_type']:checked").value},
    update(){
        if(document.querySelector("input[name = 'input_parts']:checked")){
            this.target = document.querySelector("input[name = 'input_parts']:checked").value;
        }else{
            this.target = undefined;
        }
    },
    previous:undefined
}
pen.target = "(test)";
let cameraOpt = {
    pos:{x:20, y:20, z:20},
    anc:{x:0, y:0, z:0},
    range:32
}
let mesh_map = new MM.map("div_button_add_parts");
let editHistory = [];
let waybackpoint = undefined;
let Preview = new PV.Previews("canvas_preview");
Preview.setObject(pen.target, map);
Preview.createPreviewCanvas();
Preview.doMarge();
let mouse = new KS.mouse(document.getElementById("canvas_main"));

let z = new KS.keyStatus("z");
let Z = new KS.keyStatus("Z");
let ctrl = new KS.keyStatus("Control");
let shft = new KS.keyStatus("Shift");

let hitPos;
let hitColor;
let hitFace;
let hitObj;
let hitIndex;
let phitIndex;
let placeIndex;
let pplaceIndex;
let grid = {hit:undefined,place:undefined};
let rot = {H:0, V:0};
let change = 0;
let show_edge = 0;
let temp = {};
let clickCheck = 0;
let undo_check = 0;
let Fill = {
    p1:{x:0, y:0, z:0, set:0},
    p2:{x:0, y:0, z:0, set:0},
    reset(){
        this.p1 = {x:0, y:0, z:0, set:0};
        this.p2 = {x:0, y:0, z:0, set:0};
    }
};
//必要な関数

function sceneUpdate(renderer, new_map, edge){
    renderer.remove(mesh_map.mesh);
    renderer.remove(mesh_map.edge, true);
    mesh_map.meshMap(new_map, pen.target);
    for(const parts in map){
        if(parts != "version"){
            document.getElementById("button_" + parts).addEventListener("click",()=>{
                delete map[parts];
                sceneUpdate(mainScreen, map, show_edge == 1);
                change = 1;
            });
        }
    }
    renderer.add(mesh_map.mesh);
    if(edge) renderer.add(mesh_map.edge, true);
}

async function download_data(data, type = "c2d"){
    const name = document.getElementById("input_file_name").value;
    const handle = await window.showSaveFilePicker({
        suggestedName : name + "." + type,
        types:[{
            description:"BoxToDot File",
            accept:{
                "application/json":["." + type]
            }
        }]
    });
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
}

function deleteTemp(){
    for(const TEMP in temp){
        mainScreen.remove(temp[TEMP]);
        delete temp[TEMP];
    }
    temp = {};
}

function NotInMap(key, MAP){
    for(const part in MAP){
		if(part != "version"){
			if(Object.keys(MAP[part]).includes(key)) return false;
		}
	}
	return true;
}

//イベントリスナー
document.getElementById("select_file").addEventListener("change",()=>{
    const file_act = document.getElementById("select_file").value;
    console.log(file_act);
    if(file_act != "default"){
        if(file_act == "load"){
            map = {"version":"0628"}
            document.getElementById("load_project").click();
        }else if(file_act == "save-all"){
           download_data(JSON.stringify(map, null, "\t"));
        }else if(file_act == "save-part"){
            let saving = {"version":"0628"};
            saving[pen.target] = map[pen.target];
            download_data(JSON.stringify(saving, null, "\t"));
        }else if(file_act == "export-all"){
            let temp_target = pen.target;
            pen.target = "all";
            sceneUpdate(mainScreen, map, show_edge == 1);
            download_data(JSON.stringify(Preview.doMarge(true, document.getElementById("input_file_name").value), null, "\t"), "json");
            pen.target = temp_target;
            sceneUpdate(mainScreen, map, show_edge == 1);
        }else if(file_act == "export-part"){
            download_data(JSON.stringify(Preview.doMarge(true, pen.target), null, "\t"), "json");
        }
    }
    document.getElementById("select_file").selectedIndex = 0;
});

document.getElementById("load_project").addEventListener("change", ()=>{
    const file = document.getElementById("load_project");
    let filename = file.files[0].name.replace(/\.[^.]+$/,"");
    document.getElementById("input_file_name").value = filename;
    if(file.files.length > 0){
        const reader = new FileReader();
        reader.onload = ()=>{
            let loadingProject = JSON.parse(reader.result);
            map = {...map, ...loadingProject};
            pen.target = "all";
            sceneUpdate(mainScreen, map, show_edge == 1);
            change = 1;
        };
        reader.readAsText(file.files[0]);
    }
});

document.getElementById("button_toggleShadow").addEventListener("click",()=>{
    Preview.toggleShadow(map);
});

document.getElementById("button_toggleOverlap").addEventListener("click",()=>{
    Preview.toggleOverlap(map);
});

document.getElementById("button_toggle_edge").addEventListener("click",()=>{
    show_edge = 1 - show_edge;
    sceneUpdate(mainScreen, map, show_edge == 1);
});


document.getElementById("button_add_parts").addEventListener("click", ()=>{
    let name = "(" + window.prompt("パーツ名を指定") + ")";
    map[name] = {};
    console.log(map);
    pen.target = name;
    sceneUpdate(mainScreen, map, show_edge == 1);
    change = 1;
});

document.getElementById("canvas_main").oncontextmenu = ()=>{return false};

//3D周りの宣言とか初期設定
const mainScreen = new TH.renderer(main, "canvas_main");
mainScreen.setCamera(cameraOpt);
let plane = new Three.Mesh(new Three.PlaneGeometry(100,100), new Three.MeshBasicMaterial({visible:false}));
plane.rotation.x = -Math.PI/2;
mainScreen.add(plane);
mainScreen.add(new Three.GridHelper(16, 16, 0xFFFFFF, 0x000000));
sceneUpdate(mainScreen, map, show_edge == 1);
const axis = new TH.renderer(main, "canvas_axis");
axis.setCamera({pos:{x: cameraOpt.pos.x - cameraOpt.anc.x, y: cameraOpt.pos.y - cameraOpt.anc.y, z: cameraOpt.pos.z - cameraOpt.anc.z},anc:{x:0,y:0,z:0},range:2});
axis.add(new Three.AxesHelper(1));

class temporaryBlock{
    constructor(){
        this.geometry = new Three.BoxGeometry(1, 1, 1);
        this.material = new Three.MeshBasicMaterial({
            color:0xff0000,
            transparent:true,
            opacity:0.3,
            depthWrite:false
        });
    }
    mesh(){
        return new Three.Mesh(this.geometry, this.material);
    }
}

const TempBlock = new temporaryBlock();

//メインアニメーション
let frames = 0;
function main(){
    mouse.mode("auto");
    let relCamPos = {x:cameraOpt.pos.x-cameraOpt.anc.x, y:cameraOpt.pos.y-cameraOpt.anc.y, z:cameraOpt.pos.z-cameraOpt.anc.z};
    let cos = relCamPos.z/Math.sqrt(relCamPos.x**2+relCamPos.z**2);
    let sin = relCamPos.x/Math.sqrt(relCamPos.x**2+relCamPos.z**2);
    let siny = relCamPos.y/Math.sqrt(relCamPos.x**2+relCamPos.y**2+relCamPos.z**2);
    let cosy = Math.sqrt((relCamPos.x**2+relCamPos.z**2))/Math.sqrt(relCamPos.x**2+relCamPos.y**2+relCamPos.z**2);
    if(mouse.onit == 1){
        mouse.mode("crosshair");
        hitPos = mainScreen.castRay(mouse.pos());
        hitColor = undefined;
        hitObj = undefined;
        if(hitPos.length > 0){
            hitColor = new Three.Color(0,0,0);
			hitObj = undefined;
			if(hitPos[0].object.geometry.type == "BufferGeometry"){
				hitIndex = mesh_map.info[hitPos[0].faceIndex].pos;
				hitObj = mesh_map.info[hitPos[0].faceIndex].parts;
				grid.hit = JSON.parse(JSON.stringify(map[hitObj][hitIndex].pos));
				grid.place = {x:grid.hit.x + mesh_map.info[hitPos[0].faceIndex].face.x, y:grid.hit.y + mesh_map.info[hitPos[0].faceIndex].face.y, z:grid.hit.z + mesh_map.info[hitPos[0].faceIndex].face.z};
				hitFace = "(" + mesh_map.info[hitPos[0].faceIndex].face.x + "," + mesh_map.info[hitPos[0].faceIndex].face.y + "," + mesh_map.info[hitPos[0].faceIndex].face.z + ")";
				hitColor = mesh_map.info[hitPos[0].faceIndex].color;
			}else if(hitPos[0].object.geometry.type == "BoxGeometry"){
				grid.hit.x = hitPos[0].object.position.x-0.5;
				grid.hit.y = hitPos[0].object.position.y-0.5;
				grid.hit.z = hitPos[0].object.position.z-0.5;
				grid.place.x = grid.hit.x + hitPos[0].face.normal.x;
				grid.place.y = grid.hit.y + hitPos[0].face.normal.y;
				grid.place.z = grid.hit.z + hitPos[0].face.normal.z;
				hitObj = "Temporary";
			}else{
				grid.hit = {x:Math.floor(hitPos[0].point.x), y:Math.floor(hitPos[0].point.y+0.5), z:Math.floor(hitPos[0].point.z)}
				grid.place = {x:grid.hit.x, y:grid.hit.y, z:grid.hit.z};
                hitObj = "Plane";
			}
			hitIndex = "(" + grid.hit.x + "," + grid.hit.y + "," + grid.hit.z + ")";
			placeIndex = "(" + grid.place.x + "," + grid.place.y + "," + grid.place.z + ")";
			document.getElementById("div_text_position").textContent = "Grid(hit: " + hitIndex + ", place: " + placeIndex + ", hit part: " + hitObj;
        }
        if(mouse.status == 1){
            if(mouse.button == 1){
                mouse.mode("all-scroll");
                rot.H = -0.1*mouse.vx;
                rot.V = 0.1*mouse.vy;
            }else if(mouse.button == 2){
                if(clickCheck == 0 && hitPos.length > 0){
                    clickCheck = 1;
                    if((hitObj == pen.target || pen.target == "all") && hitPos[0].object.geometry.type == "BufferGeometry"){
                        delete map[hitObj][hitIndex];
                        sceneUpdate(mainScreen, map, show_edge == 1);
                        change = 1;
                    }else if(hitObj == "Temporary"){
                        mainScreen.remove(temp[hitIndex]);
                        delete temp[hitIndex];
                    }
                }
            }else if(mouse.button == 0 && hitPos.length > 0){
                if(pen.mode == "sampler"){
                    document.getElementById("input_pen_color").value = "#" + hitColor.getHexString();
                }else if(pen.mode == "anchor"){
                    if(clickCheck == 0){
                        clickCheck = 1;
                        cameraOpt.anc.x = grid.hit.x;
                        cameraOpt.anc.y = grid.hit.y;
                        cameraOpt.anc.z = grid.hit.z;
                    }
                }else if(pen.mode == "block"){
                    if((clickCheck == 0 || hitIndex != pen.previous)){
                        if(Object.keys(temp).includes(hitIndex)){
                            deleteTemp();
                        }
                        pen.previous = placeIndex;
                        if(pen.target){
                            if(pen.target == "all"){
                                if(Object.keys(map).length == 1){
                                    if(clickCheck == 0) window.alert("編集対象のパーツが必要です");
                                }else if(hitObj != "Plane" && hitObj != "Temporary"){
                                    map[hitObj][placeIndex] = {
                                        pos:{
                                            x:grid.place.x,
                                            y:grid.place.y,
                                            z:grid.place.z
                                        },
                                        color:pen.color
                                    };
                                }
                            }else{
                                map[pen.target][placeIndex] = {
                                    pos:{
                                        x:grid.place.x,
                                        y:grid.place.y,
                                        z:grid.place.z
                                    },
                                    color:pen.color
                                };
                            }
                            sceneUpdate(mainScreen, map, show_edge == 1);
                        }else{
                            if(clickCheck == 0) window.alert("編集対象のパーツが必要です");
                        }
                        clickCheck = 1;
                        change = 1;
                    }
                }else if(pen.mode == "temp"){
                    if(clickCheck == 0){
                        clickCheck = 1;
                        temp[placeIndex] = TempBlock.mesh();
                        temp[placeIndex].position.set(grid.place.x + 0.5, grid.place.y + 0.5, grid.place.z + 0.5);
                        mainScreen.add(temp[placeIndex]);
                    }
                }else if(pen.mode == "brush_six"){
                    if((hitObj == pen.target || pen.target == "all") && hitPos[0].object.geometry.type == "BufferGeometry"){
                        if(!(hitObj == "Plane" || hitObj == "Temporary")){
                            if((hitObj == pen.target || pen.target == "all") && map[hitObj][hitIndex].color != pen.color){
                                map[hitObj][hitIndex].color = pen.color;
                                for(const face in map[hitObj][hitIndex]){
                                    if(face != "color" && face != "pos"){
                                        delete map[hitObj][hitIndex][face];
                                    }
                                }
                                sceneUpdate(mainScreen, map, show_edge == 1);
                                change = 1;
                            }
                        }
                        
                    }
                }else if(pen.mode == "brush"){
                    if((hitObj == pen.target || pen.target == "all") && hitPos[0].object.geometry.type == "BufferGeometry"){
                        if(!(hitObj == "Plane" || hitObj == "Temporary")){
                            if((hitObj == pen.target || pen.target == "all")){
                                if(map[hitObj][hitIndex][hitFace] != pen.color){
                                    map[hitObj][hitIndex][hitFace] = pen.color;
                                    sceneUpdate(mainScreen, map, show_edge == 1);
                                    change = 1;
                                }

                            }
                        }

                    }
                }else if(pen.mode == "fill"){
                    if(clickCheck == 0){
                        clickCheck = 1;
                        if(Fill.p1.set == 0){
                            Fill.p1.set = 1;
                            Fill.p1.x = grid.place.x;
                            Fill.p1.y = grid.place.y;
                            Fill.p1.z = grid.place.z;
                            temp[placeIndex] = TempBlock.mesh();
                            temp[placeIndex].position.set(grid.place.x + 0.5, grid.place.y + 0.5, grid.place.z + 0.5);
                            mainScreen.add(temp[placeIndex]);
                        }else{
                            Fill.p2.set = 1;
                            Fill.p2.x = grid.place.x;
                            Fill.p2.y = grid.place.y;
                            Fill.p2.z = grid.place.z;
                            deleteTemp();
                            for(let x = Math.min(Fill.p1.x, Fill.p2.x); x <= Math.max(Fill.p1.x, Fill.p2.x); x++){
                                for(let y = Math.min(Fill.p1.y, Fill.p2.y); y <= Math.max(Fill.p1.y, Fill.p2.y); y++){
                                    for(let z = Math.min(Fill.p1.z, Fill.p2.z); z <= Math.max(Fill.p1.z, Fill.p2.z); z++){
                                        const fillIndex = "(" + x + "," + y + "," + z + ")";
                                        if(NotInMap(fillIndex, map) && ((x-Fill.p1.x)*(x-Fill.p2.x)*(y-Fill.p1.y)*(y-Fill.p2.y)*(z-Fill.p1.z)*(z-Fill.p2.z) == 0)){
                                            console.log();
                                            if(hitObj == "Plane" || hitObj == "Temporary"){
                                                if(pen.target != all){
                                                    map[pen.target][fillIndex] = {
                                                        pos:{x:x,y:y,z:z},
                                                        color:pen.color
                                                    };
                                                }
                                            }else{
                                                if(pen.target != "all"){
                                                    map[pen.target][fillIndex] = {
                                                        pos:{x:x,y:y,z:z},
                                                        color:pen.color
                                                    };
                                                }else{
                                                    map[hitObj][fillIndex] = {
                                                        pos:{x:x,y:y,z:z},
                                                        color:pen.color
                                                    };
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            Fill.reset();
                            sceneUpdate(mainScreen, map, show_edge == 1);
                            change = 1;

                        }
                    }
                }else if(pen.mode == "eraser"){
                    if(clickCheck == 0 && hitPos.length > 0){
                        clickCheck = 1;
                        if((hitObj == pen.target || pen.target == "all") && hitPos[0].object.geometry.type == "BufferGeometry"){
                            delete map[hitObj][hitIndex];
                            sceneUpdate(mainScreen, map, show_edge == 1);
                            change = 1;
                        }else if(hitObj == "Temporary"){
                            mainScreen.remove(temp[hitIndex]);
                            delete temp[hitIndex];
                        }
                    }
                }else if(pen.mode == "beam"){
                    if((clickCheck == 0 || placeIndex != phitIndex) && hitPos.length > 0){
                        clickCheck = 1;
                        if((hitObj == pen.target || pen.target == "all") && hitPos[0].object.geometry.type == "BufferGeometry"){
                            delete map[hitObj][hitIndex];
                            sceneUpdate(mainScreen, map, show_edge == 1);
                            change = 1;
                        }else if(hitObj == "Temporary"){
                            mainScreen.remove(temp[hitIndex]);
                            delete temp[hitIndex];
                        }
                    }
                }
            }
        }else{
            clickCheck = 0;
        }
        pplaceIndex = placeIndex;
        phitIndex = hitIndex;
    }
    if(change == 1 && clickCheck == 0){
        //ctrl-zとか
        if(waybackpoint == undefined){
            waybackpoint = editHistory.length - 1;
        }
        waybackpoint++;
        editHistory.splice(waybackpoint);
        editHistory.push(JSON.stringify(map));
        sceneUpdate(mainScreen, map, show_edge == 1);
        Preview.setObject(pen.target, map);
        Preview.update(map);
        Preview.doMarge();
        change = 0;
    }else if(clickCheck == 0){
        if(0 < (Z.status + z.status)){
            if(undo_check == 0){
                if(ctrl.status == 1){
                    undo_check = 1;
                    if(waybackpoint == undefined){
                        waybackpoint = editHistory.length - 1;
                    }
                    if(shft.status == 1){
                        if(waybackpoint < editHistory.length - 1){
                            waybackpoint++;
                        }
                    }else{
                        if(waybackpoint > 0){
                            waybackpoint--;
                        }
                    }
                    deleteTemp();
                    if(waybackpoint == 0){
                        map = {"version":"0629"};
                    }else{
                        map = JSON.parse(editHistory[waybackpoint]);
                    }
                    sceneUpdate(mainScreen, map, show_edge == 1);
                }
            }
        }else{
            undo_check = 0;
        }
        if(document.querySelector("input[name = 'input_parts']:checked")){
            if(document.querySelector("input[name = 'input_parts']:checked").value != pen.target){
                pen.update();
                Preview.setObject(pen.target, map);
                Preview.update(map);
                Preview.doMarge();
            }
        }
    }
    relCamPos.x += rot.H*cos+rot.V*siny*sin;
    relCamPos.z += -rot.H*sin+rot.V*siny*cos;
    relCamPos.y += rot.V*cosy;
    relCamPos.r = Math.sqrt(relCamPos.x**2 + relCamPos.y**2 + relCamPos.z**2);
    cameraOpt.pos.x = cameraOpt.anc.x + Math.sqrt(1200)*relCamPos.x/relCamPos.r;
    cameraOpt.pos.y = cameraOpt.anc.y + Math.sqrt(1200)*relCamPos.y/relCamPos.r;
    cameraOpt.pos.z = cameraOpt.anc.z + Math.sqrt(1200)*relCamPos.z/relCamPos.r;
    pen.update();
    mainScreen.setCamera(cameraOpt);
    axis.setCamera({pos:{x: cameraOpt.pos.x - cameraOpt.anc.x, y: cameraOpt.pos.y - cameraOpt.anc.y, z: cameraOpt.pos.z - cameraOpt.anc.z},anc:{x:0,y:0,z:0},range:2});
    axis.render();
    mainScreen.render();
}