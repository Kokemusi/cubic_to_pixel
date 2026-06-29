export class keyStatus{
	constructor(keyname, element = document){
		this.key = keyname;
		this.status = 0;
		this.onDown = 0;
		this.onUp = 0;
		element.addEventListener("keydown",(event)=>{
			this.onUp = 0;
			if(event.key == this.key && this.status == 0){
				this.status = 1;
				this.onDown = 1;
			}else{
				this.onDown = 0;
			}
		});
		element.addEventListener("keyup",(event)=>{
			if(event.key == this.key){
				this.status = 0;
				this.onDown = 0;
				this.onUp = 1;
			}
		});
	}}

export class mouse{
	constructor(element = document, button){
		this.button = button;
		this.x = 0;
		this.y = 0;
		this.vx = 0;
		this.vy = 0;
		this.status = 0;
		this.onit = 0;
		this.element = element;
		this.moving = false;
		this.timer = 0;
		this.onDown = 0;
		element.addEventListener("mousedown",(event)=>{
			this.button = event.button;
			if(this.status == 0){
				this.status = 1;
				this.onDown = 1;
			}else{
				this.onDown = 0;
			}
		});
		element.addEventListener("mouseup",(event)=>{
			this.button = event.button;
			this.status = 0;
			this.onDown = 0;
		});
		element.addEventListener("mousemove",(event)=>{
			clearTimeout(this.timer);
			this.x = event.offsetX;
			this.y = event.offsetY;
			this.vx = event.movementX;
			this.vy = event.movementY;
			this.timer = setTimeout(()=>{
				this.vx = 0;
				this.vy = 0;
			},5);
		});
		element.addEventListener("mouseenter",()=>{
			this.onit = 1;
		});
		element.addEventListener("mouseleave",()=>{
			this.onit = 0;
			this.status = 0;
		});
	}
	mode(mode = undefined){
		if(mode == undefined){
			return this.element.style.cursor;
		}else{
			this.element.style.cursor = mode;
		}
	}
	pos(){
		return {x:this.x,y:this.y};
	}
}