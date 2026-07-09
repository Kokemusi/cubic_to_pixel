class preview{
    constructor(dir, dot, view, part = undefined){
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d", {willReadFrequently:true});
        this.ImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.data = this.ImageData.data;
        this.dir = (dir% 4 + 4) % 4;
        this.dot = dot;
        this.view = (view % 4 + 4 ) % 4;
        this.part = part;
        this.minY = -32;
        this.maxY = 32;
        this.minX = -32;
        this.maxX = 32;
        this.shadow = 1;
        this.overlap = 0;
        this.sunPos = {x:1/Math.sqrt(4), y:1.5/Math.sqrt(4), z:1.5/Math.sqrt(4)};
    }
    get2dPos(pos){
        let xz = this.getPos(pos.x, pos.z);
        return {x:(xz.x - xz.z), y:((xz.x + xz.z)/2-pos.y)};
    }
    setColor(i, r, g, b, a){
        this.data[4 * i] = r;
        this.data[4 * i + 1] = g;
        this.data[4 * i + 2] = b;
        this.data[4 * i + 3] = a;
    }
    createImage(faces){
        this.ImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.data = this.ImageData.data;
        for(const face in faces){
            let x = this.get2dPos(face.pos).x;
            let y = this.get2dPos(face.pos).y;
            let c = face.color;
            for(let i = 0; i < this.dot; i++){
                for(let j = 0; j < this.dot; j++){
                    let ix = x * this.dot + i;
                    let iy = y * this.dot + j;
                    this.setColor(iy * this.canvas.width + ix, c.r, c.g, c.b, c.a);
                }
            }
        }
        this.ctx.putImageData(this.ImageData, 0, 0);
    }
    getDist(pos){
        return this.getPos(pos.x, pos.z).x + pos.y + this.getPos(pos.x, pos.z).z;
    }
    compare(a,b){
        let d = this.getDist(a.pos) - this.getDist(b.pos);
        if(d != 0){
            return d;
        }
        d = a.pos.y - b.pos.y;
        if(d != 0){
            return d;
        }
        d = a.pos.x - b.pos.x;
        if(d != 0){
            return d;
        }
        d = a.pos.z - b.pos.z;
        return d;
    }
    getShadow(nv){
        let dot = (nv.x * this.sunPos.x + nv.y * this.sunPos.y + nv.z * this.sunPos.z);
        let size = Math.sqrt(nv.x ** 2 + nv.y ** 2 + nv.z **2);
        dot /= size;
        let shadowCoe = (dot+3)/4;
        return shadowCoe;
    }
    update(map){
        let faces = [];
        let face_group = {"default":[]};
        let face_nv = {};//{x:x,y:y,z:z,n:n}
        let faceV = {
            "(0,1,0)":{x:0.5, y:1, z:0.5},
            "(1,0,0)":{x:1, y:0.5, z:0.5},
            "(0,0,1)":{x:0.5, y:0.5, z:1},
            "(-1,0,0)":{x:0, y:0.5, z:0.5},
            "(0,0,-1)":{x:0.5, y:0.5, z:0}
        };
        let faceDir = {
            "(0,1,0)":{x:0, y:1, z:0},
            "(1,0,0)":{x:1, y:0, z:0},
            "(0,0,1)":{x:0, y:0, z:1},
            "(-1,0,0)":{x:-1, y:0, z:0},
            "(0,0,-1)":{x:0, y:0, z:-1}
        };
        let range = {min:{x:0,y:0},max:{x:0,y:0}};
        //面のグループ作成+平均法線を計算
        for(const part in map){
            if(part != "version"){
                for(const pos in map[part]){
                    let box = map[part][pos];
                    let plane_id = box.plane;
                    for(const face in faceV){
                        if(box.plane != undefined){
                            plane_id = box.plane[face];
                        }else{
                            plane_id = undefined;
                        }
                        let face_color = box[face];
                        if(face_color == undefined) face_color = box.color;
                        let face_pos = {
                            x:box.pos.x + faceV[face].x,
                            y:box.pos.y + faceV[face].y,
                            z:box.pos.z + faceV[face].z,
                        }
                        let face_data = {pos:face_pos, color:face_color, face:faceDir[face], part:part};
                        if(plane_id != undefined){
                            if(face_group[plane_id] == undefined) face_group[plane_id] = [];
                            if(face_nv[plane_id] == undefined) face_nv[plane_id] = {x:0,y:0,z:0,n:0};
                            face_group[plane_id].push(face_data);
                            face_nv[plane_id].x = (face_nv[plane_id].x * face_nv[plane_id].n + face_data.pos.x) / face_nv[plane_id].n;
                            face_nv[plane_id].y = (face_nv[plane_id].y * face_nv[plane_id].n + face_data.pos.y) / face_nv[plane_id].n;
                            face_nv[plane_id].z = (face_nv[plane_id].z * face_nv[plane_id].n + face_data.pos.z) / face_nv[plane_id].n;
                            face_nv[plane_id].n++;
                        }else{
                            face_group.default.push(face_data);
                        }
                    }
                }
            }
        }
        //面の方向を所属面に合わせる
        for(const group in face_group){
            if(group != "default"){
                for(const face in face_group[group]){
                    face_group[group][face].face = face_nv[group];
                }
            }
        }
        //面の3次元上の位置と影付きの色を計算
        for(const group in face_group){
            for(const face in face_group[group]){
                let color = new Three.Color(face_group[group][face].color);
                color.convertLinearToSRGB();
                let faceInfo = {
                    pos:face_group[group][face].pos, 
                    color:{
                        r:255 * color.r * this.getShadow(face_group[group][face].face),
                        g:255 * color.g * this.getShadow(face_group[group][face].face),
                        b:255 * color.b * this.getShadow(face_group[group][face].face),
                        a:255
                    }
                }
                if(this.part[face_group[group][face].part] == 0){
                    faces.push(faceInfo);
                    if(range.min.x > this.dot * this.get2dPos(face_group[group][face].pos.x)){
                        range.min.x = this.dot * this.get2dPos(face_group[group][face].pos.x);
                    }else if(range.min.y > this.dot * this.get2dPos(face_group[group][face].pos.y)){
                        range.min.y = this.dot * this.get2dPos(face_group[group][face].pos.y);
                    }else if(range.max.x < this.dot * this.get2dPos(face_group[group][face].pos.x)){
                        range.max.x = this.dot * this.get2dPos(face_group[group][face].pos.x);
                    }else if(range.max.y < this.get2dPos(face_group[group][face].pos.y)){
                        range.max.y = this.dot * this.get2dPos(face_group[group][face].pos.y);
                    }
                }else if(this.overlap == 1){
                    faceInfo.color.a = 0;
                    faces.push(faceInfo);
                }
            }
        }

        //情報を奥から順番にする
        faces.sort((a,b)=>(this.compare(a, b)));

        //canvas設定
        this.canvas.width = range.max.x - range.min.x + this.dot;
        this.canvas.height = range.max.y - range.min.y + this.dot;

        this.createImage(faces);
    }
    getPos(x, z){
        return {x:x*Math.round(Math.cos((this.dir-this.view)*Math.PI/2))+z*Math.round(Math.sin((this.dir-this.view)*Math.PI/2)), z:-x*Math.round(Math.sin((this.dir-this.view)*Math.PI/2))+z*Math.round(Math.sin((this.dir-this.view)*Math.PI/2))};
    }
    toggleShadow(){
        this.shadow = 1 - this.shadow;
    }
    toggleOverlap(){
        this.overlap = 1 - this.overlap;
    }
}