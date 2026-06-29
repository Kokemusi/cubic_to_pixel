import * as Three from "three/webgpu"
import * as bufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

class map{
    constructor(parts_element){
        this.faceV = [{x:-1,y:0,z:0},{x:1,y:0,z:0},{x:0,y:-1,z:0},{x:0,y:1,z:0},{x:0,y:0,z:-1},{x:0,y:0,z:1}];
        this.faceL = [
			[0,1,3,2],
			[4,5,7,6],
			[0,1,5,4],
			[2,3,7,6],
			[0,2,6,4],
			[1,3,7,5]
		];
        this.facePc = [];
        for(let i = 0; i < 2; i++){
			for(let j = 0; j < 2; j++){
				for(let k = 0; k < 2; k++){
					this.facePc.push({x:i,y:j,z:k});
				}
			}
		}
        this.mesh = undefined;
        this.edge = undefined;
        this.info = undefined;
    }
    meshMap(data, editing){
        const material = new Three.MeshBasicMaterial({vertexColors : true, side : Three.DoubleSide});
        const geometry = new Three.BufferGeometry();
        const edgeMaterial = new Three.LineBasicMaterial({color:0x000000});
        const edgeGeometry = new Three.BufferGeometry();
        let ends = [];
        let apexes = [];
        let colors = [];
        let indices = [];
        let faceInfo = [];
        let partsHTML = "<input name = 'input_parts' type = 'radio' value ='all' id = 'radio_all' ";
        if(editing == "all" || editing == undefined){
            partsHTML += "checked "
        }
        partsHTML += "class = 'radio' /><label for = 'radio_all'>All</label>"
        for(const parts in data){
            if(parts != "version"){
                partsHTML += "<input name = 'input_parts' type = 'radio' id = 'radio_" + parts + "' value = '" + parts + "' "
                if(parts == editing){
                    partsHTML += "checked "
                }
                partsHTML += "class = 'radio' /><label for = 'radio_" + parts + "'>" + parts + "</label>"
                for(const block in data[parts]){
                    let x = data[parts][block].pos.x;
                    let y = data[parts][block].pos.y;
                    let z = data[parts][block].pos.z;
                    let c;
                    for(const v in this.faceV){
                        let sideIndex = "(" + (x + this.faceV[v].x) + "," + (y + this.faceV[v].y) + "," + (z + this.faceV[v].z) + ")";
                        if(!Object.keys(data[parts]).includes(sideIndex)){
                            let face = "(" + (this.faceV[v].x) + "," + (this.faceV[v].y) + "," + (this.faceV[v].z) + ")";
                            let faceStart = apexes.length/3;
                            if(!Object.keys(data[parts][block]).includes(face)){
                                c = new Three.Color(data[parts][block].color);
                            }else{
                                c = new Three.Color(data[parts][block][face]);
                            }
                            for(let i = 0; i < 2 - Math.abs(this.faceV[v].x); i++){
                                for(let j = 0; j < 2 - Math.abs(this.faceV[v].y); j++){
                                    for(let k = 0; k < 2 - Math.abs(this.faceV[v].z); k++){
                                        apexes.push(x + i + Math.max(0, this.faceV[v].x));
                                        apexes.push(y + j + Math.max(0, this.faceV[v].y));
                                        apexes.push(z + k + Math.max(0, this.faceV[v].z));
                                        colors.push(c.r, c.g, c.b);
                                    }
                                }
                            }
                            faceInfo.push({parts:parts, pos:"(" + x + "," + y + "," + z + ")", face:this.faceV[v], color:c});
                            faceInfo.push({parts:parts, pos:"(" + x + "," + y + "," + z + ")", face:this.faceV[v], color:c});
                            indices.push(faceStart + 0);
                            indices.push(faceStart + 1);
                            indices.push(faceStart + 3);
                            indices.push(faceStart + 0);
                            indices.push(faceStart + 2);
                            indices.push(faceStart + 3);
                            
                        }
                        for(let si = 0; si < 4; si++){
                            for(let i = si; i < 2 + si; i++){
                                ends.push(x + this.facePc[this.faceL[v][i%4]].x);
                                ends.push(y + this.facePc[this.faceL[v][i%4]].y);
                                ends.push(z + this.facePc[this.faceL[v][i%4]].z);
                            }
                        }
                    }
                }
            }
        }
        document.getElementById("div_container_radio_parts").innerHTML = partsHTML;
        if(Object.keys(data).length > 1){
            geometry.setAttribute("position", new Three.Float32BufferAttribute(apexes, 3));
            geometry.setAttribute("color", new Three.Float32BufferAttribute(colors, 3));
            geometry.setIndex(indices);
            edgeGeometry.setAttribute("position", new Three.Float32BufferAttribute(ends, 3));
            this.mesh = new Three.Mesh(geometry, material);
            this.edge = new Three.LineSegments(edgeGeometry, edgeMaterial);
            this.info = faceInfo;
            return {mesh:this.mesh, edge:this.edge, info:faceInfo};
        }else{
            this.mesh = undefined;
            this.edge = undefined;
            this.info = undefined;
            return {mesh:undefined, edge:undefined, info:undefined};
        }
    }
}

export{ map }