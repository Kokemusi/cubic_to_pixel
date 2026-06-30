import * as Three from "three/webgpu"
import * as bufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

class renderer{
    constructor(callback = undefined, canvas, resolution = 1){
        this.canvas = document.getElementById(canvas);
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.option = undefined;
        this.renderer= new Three.WebGPURenderer({canvas:this.canvas, alpha:true});
        this.renderer.outputColorSpace = Three.SRGBColorSpace;
        this.resolution = resolution;
        this.renderer.setPixelRatio(resolution);
        this.scene = new Three.Scene();
        this.scene.background = new Three.Color(0x7f7f7f);
        this.edgeExistence = false;
        if(callback != undefined){
            this.renderer.setAnimationLoop(callback);
        }
        this.aspect = this.canvas.width/this.canvas.height;
    }
    setCamera(option){
        this.option = option;
        if(this.camera == undefined){
            this.camera = new Three.OrthographicCamera(-option.range/2, option.range/2, option.range/2/this.aspect, -option.range/2/this.aspect, 0.1, 200);
        }else{
            this.camera.left = -option.range/2;
            this.camera.right = option.range/2;
            this.camera.top = option.range/2/this.aspect;
            this.camera.bottom = -option.range/2/this.aspect;
        }
        this.camera.position.set(option.pos.x, option.pos.y, option.pos.z);
        this.camera.lookAt(new Three.Vector3(option.anc.x, option.anc.y, option.anc.z));
        this.camera.aspect = this.aspect;
        this.camera.updateProjectionMatrix();
    }
    render(){
        if(this.canvas.width != this.canvas.parentElement.clientWidth || this.canvas.height != this.canvas.parentElement.clientHeight){
            this.renderer.setSize(this.canvas.parentElement.clientWidth, this.canvas.parentElement.clientHeight);
            this.aspect = this.canvas.width/this.canvas.height;
            this.setCamera(this.option);
        }
        if(this.scene && this.camera){
            this.renderer.render(this.scene, this.camera);
        }
    }
    add(mesh, edge = false){
        if(edge){
            if(!this.edgeExistence){
                this.scene.add(mesh);
                this.edgeExistence = true;
            }
        }else if(mesh) this.scene.add(mesh);
    }
    remove(mesh, edge = false){
        if(mesh){
            if(edge){
                if(this.edgeExistence){
                    this.scene.remove(mesh);
                    this.edgeExistence = false;
                }
            }else{
                this.scene.remove(mesh);
            }
        };
    }
    castRay(from){
        this.raycaster = new Three.Raycaster();
        this.raycaster.far = 1000;
        let nfrom = {x:2*from.x*this.resolution/this.canvas.width-1,y:-2*from.y*this.resolution/this.canvas.height+1};
        this.raycaster.setFromCamera(nfrom, this.camera);
        return this.raycaster.intersectObjects(this.scene.children).filter(i => i.object.userData.raycaster);
    }
}

export { renderer };