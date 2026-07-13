import * as Three from "three/webgpu"
import * as bufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

class partsHTML{
    constructor(parent){
        this.parent = document.getElementById(parent);
        this.parent.innerHTML = "";
        this.showtext = ["shown", "half", "hidden"];
    }
    add(text, value, checked, show = undefined){
        this.container = document.createElement("div");
        this.container.id = "div_container_part_" + value;
        this.container.style = 'display:flex; flex-direction:row;';
        this.name = document.createElement("input");
        this.name.name = "input_parts"
        this.name.type = "radio";
        this.name.id = "radio_" + value;
        this.name.value = value;
        this.name.checked = checked;
        this.name.style.display = "none";
        this.label = document.createElement("label");
        this.label.htmlFor = "radio_" + value;
        this.label.height = "22px";
        this.label.style.minWidth = "80px";
        if(value != "all"){
            this.title = document.createElement("input");
            this.title.value = text;
            this.title.id = "input_text_part_" + value;
            this.title.style.fieldSizing = "content";
            this.title.style.border = "none";
            this.title.style.outline = "none";
            this.title.style.fontSize = "16px";
            this.title.style.background = "transparent";
            this.label.appendChild(this.title);
        }else{
            this.label.textContent = text;
        }
        if(show != undefined){
            this.show = document.createElement("button");
            this.show.type = "button";
            this.show.id = "button_show_" + value;
            this.show.title = "表示，半透過，非表示で切り替え";
            this.showImg = document.createElement("img");
            this.showImg.src = "images/" + this.showtext[show] + ".png";
            this.show.appendChild(this.showImg);
            this.delete = document.createElement("button");
            this.delete.type = "button";
            this.delete.id = "button_delete_" + value;
            this.delete.textContent = "✕";
        }

        this.container.appendChild(this.name);
        this.container.appendChild(this.label);
        if(show != undefined) this.container.appendChild(this.show);
        if(show != undefined) this.container.appendChild(this.delete);
        this.parent.appendChild(this.container);
    }
}


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
        this.show = {};
        this.shadow = 1;
        this.sunPos = {x:0.5/Math.sqrt(4), y:2/Math.sqrt(4), z:1.5/Math.sqrt(4)};
    }
    getShadow(nv){
        let dot = (nv.x * this.sunPos.x + nv.y * this.sunPos.y + nv.z * this.sunPos.z);
        let size = Math.sqrt(nv.x ** 2 + nv.y ** 2 + nv.z **2);
        dot /= size;
        dot += 1;
        dot /= 2;
        let shadowCoe = (dot + 1)/2;
        return shadowCoe;
    }
    meshMap(data, editing, boolean = true){ 
        const faceDir = {
            "(0,1,0)":{x:0, y:1, z:0},
            "(1,0,0)":{x:1, y:0, z:0},
            "(0,0,1)":{x:0, y:0, z:1},
            "(-1,0,0)":{x:-1, y:0, z:0},
            "(0,0,-1)":{x:0, y:0, z:-1},
            "(0,-1,0)":{x:0,y:-1,z:0}
        };
        const material = new Three.MeshBasicMaterial({vertexColors : true, side : Three.DoubleSide});
        const geometry = new Three.BufferGeometry();
        const material_tl = new Three.MeshBasicMaterial({depthWrite:false, vertexColors : true, transparent:true, opacity:0.5, side : Three.DoubleSide});
        const geometry_tl = new Three.BufferGeometry();
        const edgeMaterial = new Three.LineBasicMaterial({color:0x000000});
        const edgeGeometry = new Three.BufferGeometry();
        this.ends = [];
        this.apexes = [];
        this.apexes_tl = [];
        this.colors = [];
        this.colors_tl = [];
        this.indices = [];
        this.indices_tl = [];
        this.faceInfo = [];
        //let partsHTML = "";
        let parts_content = new partsHTML("div_container_radio_parts");
        parts_content.add("All", "all", (editing == "all" || editing == undefined));
        for(const parts in data){
            if(parts != "version"){
                if(this.show[parts] == undefined){
                    this.show[parts] = 0;
                }
                parts_content.add(parts.replace(/[()]/g, ""), parts, parts == editing, this.show[parts]);
                let planes = {};
                for(const blocks in data[parts]){
                    let block = data[parts][blocks];
                    if(block.plane != undefined){
                        for(const face in block.plane){
                            let plane = block.plane[face];
                            if(block.plane[face] != "default"){
                                if(planes[plane] == undefined){
                                    planes[plane] = {x:0,y:0,z:0,n:0};
                                }
                                planes[plane].x = (planes[plane].x * planes[plane].n + faceDir[face].x)/(planes[plane].n + 1);
                                planes[plane].y = (planes[plane].y * planes[plane].n + faceDir[face].y)/(planes[plane].n + 1);
                                planes[plane].z = (planes[plane].z * planes[plane].n + faceDir[face].z)/(planes[plane].n + 1);
                                planes[plane].n++;
                            }else{
                                delete block.plane[face];
                            }
                        }
                    }
                }
                for(const block in data[parts]){
                    let x = data[parts][block].pos.x;
                    let y = data[parts][block].pos.y;
                    let z = data[parts][block].pos.z;
                    let c;
                    let faceNum = [];
                    let infoIndex = this.faceInfo.length;
                    let blockStart = undefined;
                    if(this.show[parts] == 0){
                        blockStart = this.apexes.length/3;
                    }
                    for(const v in this.faceV){
                        let sideIndex = "(" + (x + this.faceV[v].x) + "," + (y + this.faceV[v].y) + "," + (z + this.faceV[v].z) + ")";
                        if(!(sideIndex in data[parts])){
                            let face = "(" + (this.faceV[v].x) + "," + (this.faceV[v].y) + "," + (this.faceV[v].z) + ")";
                            let faceStart = undefined;
                            if(this.show[parts] == 0){
                                faceStart = this.apexes.length/3;
                            }else if(this.show[parts] == 1){
                                faceStart = this.apexes_tl.length/3;
                            }
                            if(!(face in data[parts][block])){
                                c = new Three.Color(data[parts][block].color);
                            }else{
                                c = new Three.Color(data[parts][block][face]);
                            }
                            let face_norm = this.faceV[v];
                            let face_plane = "default";
                            if(data[parts][block].plane != undefined){
                                if(data[parts][block].plane[face] != undefined){
                                    face_norm = planes[data[parts][block].plane[face]];
                                    face_plane = data[parts][block].plane[face];
                                }
                            }
                            for(let i = 0; i < 2 - Math.abs(this.faceV[v].x); i++){
                                for(let j = 0; j < 2 - Math.abs(this.faceV[v].y); j++){
                                    for(let k = 0; k < 2 - Math.abs(this.faceV[v].z); k++){
                                        if(this.show[parts] == 0){
                                            this.apexes.push(
                                                x + i + Math.max(0, this.faceV[v].x),
                                                y + j + Math.max(0, this.faceV[v].y),
                                                z + k + Math.max(0, this.faceV[v].z)
                                            );
                                            this.colors.push(c.r * this.getShadow(face_norm), c.g * this.getShadow(face_norm), c.b * this.getShadow(face_norm));
                                        }else if(this.show[parts] == 1){
                                            this.apexes_tl.push(
                                                x + i + Math.max(0, this.faceV[v].x),
                                                y + j + Math.max(0, this.faceV[v].y),
                                                z + k + Math.max(0, this.faceV[v].z)
                                            );
                                            this.colors_tl.push(c.r, c.g, c.b);
                                        }
                                    }
                                }
                            }
                            if(this.show[parts] == 0){
                                this.faceInfo.push({parts:parts, pos:"(" + x + "," + y + "," + z + ")", face:this.faceV[v], color:c, plane:face_plane, faceApexIndex:faceStart, blockApexIndex:blockStart});
                                this.faceInfo.push({parts:parts, pos:"(" + x + "," + y + "," + z + ")", face:this.faceV[v], color:c, plane:face_plane, faceApexIndex:faceStart, blockApexIndex:blockStart});
                                this.indices.push(faceStart + 0);
                                this.indices.push(faceStart + 1);
                                this.indices.push(faceStart + 3);
                                this.indices.push(faceStart + 0);
                                this.indices.push(faceStart + 2);
                                this.indices.push(faceStart + 3);
                                faceNum.push(this.faceV[v]);
                            }else if(this.show[parts] == 1){
                                this.indices_tl.push(faceStart + 0);
                                this.indices_tl.push(faceStart + 1);
                                this.indices_tl.push(faceStart + 3);
                                this.indices_tl.push(faceStart + 0);
                                this.indices_tl.push(faceStart + 2);
                                this.indices_tl.push(faceStart + 3);
                            }
                        }
                        if(this.show[parts] < 2){
                            for(let si = 0; si < 4; si++){
                                for(let i = si; i < 2 + si; i++){
                                    this.ends.push(x + this.facePc[this.faceL[v][i%4]].x);
                                    this.ends.push(y + this.facePc[this.faceL[v][i%4]].y);
                                    this.ends.push(z + this.facePc[this.faceL[v][i%4]].z);
                                }
                            }
                        }
                    }
                    for(let i = 0; i < faceNum.length; i++){
                        this.faceInfo[infoIndex + 2 * i + 0].faceNum = faceNum;
                        this.faceInfo[infoIndex + 2 * i + 1].faceNum = faceNum;
                    }
                }
            }
        }
        if(Object.keys(data).length > 1){
            geometry.setAttribute("position", new Three.Float32BufferAttribute(this.apexes, 3));
            geometry.setAttribute("color", new Three.Float32BufferAttribute(this.colors, 3));
            geometry.setIndex(this.indices);
            geometry_tl.setAttribute("position", new Three.Float32BufferAttribute(this.apexes_tl, 3));
            geometry_tl.setAttribute("color", new Three.Float32BufferAttribute(this.colors_tl, 3));
            geometry_tl.setIndex(this.indices_tl);
            edgeGeometry.setAttribute("position", new Three.Float32BufferAttribute(this.ends, 3));
            this.mesh = new Three.Mesh(geometry, material);
            this.mesh.userData.raycaster = true;
            this.mesh_tl = new Three.Mesh(geometry_tl, material_tl);
            this.edge = new Three.LineSegments(edgeGeometry, edgeMaterial);
            this.info = this.faceInfo;
            return {mesh:this.mesh, mesh_tl:this.mesh_tl, edge:this.edge, info:this.faceInfo};
        }else{
            this.mesh = undefined;
            this.edge = undefined;
            this.info = undefined;
            return {mesh:undefined, edge:undefined, info:undefined};
        }
    }
    changeFaceColor(color, index, face_norm){
        let c = new Three.Color(color);
        let shadow = this.getShadow(face_norm);
        this.colors[3 * (index + 0) + 0] = c.r * shadow;
        this.colors[3 * (index + 0) + 1] = c.g * shadow;
        this.colors[3 * (index + 0) + 2] = c.b * shadow;
        this.colors[3 * (index + 1) + 0] = c.r * shadow;
        this.colors[3 * (index + 1) + 1] = c.g * shadow;
        this.colors[3 * (index + 1) + 2] = c.b * shadow;
        this.colors[3 * (index + 2) + 0] = c.r * shadow;
        this.colors[3 * (index + 2) + 1] = c.g * shadow;
        this.colors[3 * (index + 2) + 2] = c.b * shadow;
        this.colors[3 * (index + 3) + 0] = c.r * shadow;
        this.colors[3 * (index + 3) + 1] = c.g * shadow;
        this.colors[3 * (index + 3) + 2] = c.b * shadow;
        const material = new Three.MeshBasicMaterial({vertexColors : true, side : Three.DoubleSide});
        const geometry = new Three.BufferGeometry();
        const material_tl = new Three.MeshBasicMaterial({depthWrite:false, vertexColors : true, transparent:true, opacity:0.5, side : Three.DoubleSide});
        const geometry_tl = new Three.BufferGeometry();
        const edgeMaterial = new Three.LineBasicMaterial({color:0x000000});
        const edgeGeometry = new Three.BufferGeometry();
        geometry.setAttribute("position", new Three.Float32BufferAttribute(this.apexes, 3));
        geometry.setAttribute("color", new Three.Float32BufferAttribute(this.colors, 3));
        geometry.setIndex(this.indices);
        geometry_tl.setAttribute("position", new Three.Float32BufferAttribute(this.apexes_tl, 3));
        geometry_tl.setAttribute("color", new Three.Float32BufferAttribute(this.colors_tl, 3));
        geometry_tl.setIndex(this.indices_tl);
        edgeGeometry.setAttribute("position", new Three.Float32BufferAttribute(this.ends, 3));
        this.mesh = new Three.Mesh(geometry, material);
        this.mesh.userData.raycaster = true;
        this.mesh_tl = new Three.Mesh(geometry_tl, material_tl);
        this.edge = new Three.LineSegments(edgeGeometry, edgeMaterial);
        this.info = this.faceInfo;
        return {mesh:this.mesh, mesh_tl:this.mesh_tl, edge:this.edge, info:this.faceInfo};
    }
    changeColor(color, index, faceNum){
        let c = new Three.Color(color);
        let i = 0;
        for(const v in faceNum){
            let shadow = this.getShadow(faceNum[v]);
            this.colors[3 * (index + 4 * i + 0) + 0] = c.r * shadow;
            this.colors[3 * (index + 4 * i + 0) + 1] = c.g * shadow;
            this.colors[3 * (index + 4 * i + 0) + 2] = c.b * shadow;
            this.colors[3 * (index + 4 * i + 1) + 0] = c.r * shadow;
            this.colors[3 * (index + 4 * i + 1) + 1] = c.g * shadow;
            this.colors[3 * (index + 4 * i + 1) + 2] = c.b * shadow;
            this.colors[3 * (index + 4 * i + 2) + 0] = c.r * shadow;
            this.colors[3 * (index + 4 * i + 2) + 1] = c.g * shadow;
            this.colors[3 * (index + 4 * i + 2) + 2] = c.b * shadow;
            this.colors[3 * (index + 4 * i + 3) + 0] = c.r * shadow;
            this.colors[3 * (index + 4 * i + 3) + 1] = c.g * shadow;
            this.colors[3 * (index + 4 * i + 3) + 2] = c.b * shadow;
            i++;
        }
        const material = new Three.MeshBasicMaterial({vertexColors : true, side : Three.DoubleSide});
        const geometry = new Three.BufferGeometry();
        const material_tl = new Three.MeshBasicMaterial({depthWrite:false, vertexColors : true, transparent:true, opacity:0.5, side : Three.DoubleSide});
        const geometry_tl = new Three.BufferGeometry();
        const edgeMaterial = new Three.LineBasicMaterial({color:0x000000});
        const edgeGeometry = new Three.BufferGeometry();
        geometry.setAttribute("position", new Three.Float32BufferAttribute(this.apexes, 3));
        geometry.setAttribute("color", new Three.Float32BufferAttribute(this.colors, 3));
        geometry.setIndex(this.indices);
        geometry_tl.setAttribute("position", new Three.Float32BufferAttribute(this.apexes_tl, 3));
        geometry_tl.setAttribute("color", new Three.Float32BufferAttribute(this.colors_tl, 3));
        geometry_tl.setIndex(this.indices_tl);
        edgeGeometry.setAttribute("position", new Three.Float32BufferAttribute(this.ends, 3));
        this.mesh = new Three.Mesh(geometry, material);
        this.mesh.userData.raycaster = true;
        this.mesh_tl = new Three.Mesh(geometry_tl, material_tl);
        this.edge = new Three.LineSegments(edgeGeometry, edgeMaterial);
        this.info = this.faceInfo;
        return {mesh:this.mesh, mesh_tl:this.mesh_tl, edge:this.edge, info:this.faceInfo};
    }
    addBlock(block, parts, data){
        let x = block.pos.x;
        let y = block.pos.y;
        let z = block.pos.z;
        let c;
        let faceNum = [];
        let infoIndex = this.faceInfo.length;
        let blockStart = undefined;
        if(this.show[parts] == 0){
            blockStart = this.apexes.length/3;
        }
        for(const v in this.faceV){
            let sideIndex = "(" + (x + this.faceV[v].x) + "," + (y + this.faceV[v].y) + "," + (z + this.faceV[v].z) + ")";
            if(!(sideIndex in data[parts])){
                let face = "(" + (this.faceV[v].x) + "," + (this.faceV[v].y) + "," + (this.faceV[v].z) + ")";
                let faceStart = undefined;
                if(this.show[parts] == 0){
                    faceStart = this.apexes.length/3;
                }else if(this.show[parts] == 1){
                    faceStart = this.apexes_tl.length/3;
                }
                if(!Object.keys(block).includes(face)){
                    c = new Three.Color(block.color);
                }else{
                    c = new Three.Color(block[face]);
                }
                let face_norm = this.faceV[v];
                let face_plane = "default";
                for(let i = 0; i < 2 - Math.abs(this.faceV[v].x); i++){
                    for(let j = 0; j < 2 - Math.abs(this.faceV[v].y); j++){
                        for(let k = 0; k < 2 - Math.abs(this.faceV[v].z); k++){
                            if(this.show[parts] == 0){
                                this.apexes.push(
                                    x + i + Math.max(0, this.faceV[v].x),
                                    y + j + Math.max(0, this.faceV[v].y),
                                    z + k + Math.max(0, this.faceV[v].z)
                                );
                                this.colors.push(c.r * this.getShadow(face_norm), c.g * this.getShadow(face_norm), c.b * this.getShadow(face_norm));
                            }else if(this.show[parts] == 1){
                                this.apexes_tl.push(
                                    x + i + Math.max(0, this.faceV[v].x),
                                    y + j + Math.max(0, this.faceV[v].y),
                                    z + k + Math.max(0, this.faceV[v].z)
                                );
                                this.colors_tl.push(c.r, c.g, c.b);
                            }
                        }
                    }
                }
                if(this.show[parts] == 0){
                    this.faceInfo.push({parts:parts, pos:"(" + x + "," + y + "," + z + ")", face:this.faceV[v], color:c, plane:face_plane, faceApexIndex:faceStart, blockApexIndex:blockStart});
                    this.faceInfo.push({parts:parts, pos:"(" + x + "," + y + "," + z + ")", face:this.faceV[v], color:c, plane:face_plane, faceApexIndex:faceStart, blockApexIndex:blockStart});
                    this.indices.push(faceStart + 0);
                    this.indices.push(faceStart + 1);
                    this.indices.push(faceStart + 3);
                    this.indices.push(faceStart + 0);
                    this.indices.push(faceStart + 2);
                    this.indices.push(faceStart + 3);
                    faceNum.push(this.faceV[v]);
                }else if(this.show[parts] == 1){
                    this.indices_tl.push(faceStart + 0);
                    this.indices_tl.push(faceStart + 1);
                    this.indices_tl.push(faceStart + 3);
                    this.indices_tl.push(faceStart + 0);
                    this.indices_tl.push(faceStart + 2);
                    this.indices_tl.push(faceStart + 3);
                }
            }
            if(this.show[parts] < 2){
                for(let si = 0; si < 4; si++){
                    for(let i = si; i < 2 + si; i++){
                        this.ends.push(x + this.facePc[this.faceL[v][i%4]].x);
                        this.ends.push(y + this.facePc[this.faceL[v][i%4]].y);
                        this.ends.push(z + this.facePc[this.faceL[v][i%4]].z);
                    }
                }
            }
        }
        for(let i = 0; i < faceNum.length; i++){
            this.faceInfo[infoIndex + 2 * i + 0].faceNum = faceNum;
            this.faceInfo[infoIndex + 2 * i + 1].faceNum = faceNum;
        }
        const material = new Three.MeshBasicMaterial({vertexColors : true, side : Three.DoubleSide});
        const geometry = new Three.BufferGeometry();
        const material_tl = new Three.MeshBasicMaterial({depthWrite:false, vertexColors : true, transparent:true, opacity:0.5, side : Three.DoubleSide});
        const geometry_tl = new Three.BufferGeometry();
        const edgeMaterial = new Three.LineBasicMaterial({color:0x000000});
        const edgeGeometry = new Three.BufferGeometry();
        geometry.setAttribute("position", new Three.Float32BufferAttribute(this.apexes, 3));
        geometry.setAttribute("color", new Three.Float32BufferAttribute(this.colors, 3));
        geometry.setIndex(this.indices);
        geometry_tl.setAttribute("position", new Three.Float32BufferAttribute(this.apexes_tl, 3));
        geometry_tl.setAttribute("color", new Three.Float32BufferAttribute(this.colors_tl, 3));
        geometry_tl.setIndex(this.indices_tl);
        edgeGeometry.setAttribute("position", new Three.Float32BufferAttribute(this.ends, 3));
        this.mesh = new Three.Mesh(geometry, material);
        this.mesh.userData.raycaster = true;
        this.mesh_tl = new Three.Mesh(geometry_tl, material_tl);
        this.edge = new Three.LineSegments(edgeGeometry, edgeMaterial);
        this.info = this.faceInfo;
        return {mesh:this.mesh, mesh_tl:this.mesh_tl, edge:this.edge, info:this.faceInfo};
    }
}

export{ map }