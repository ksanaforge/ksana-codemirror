/**
	put markups into CodeMirror
	do not use markups after this call
*/
var reservedfields={doc:true,lines:true,type:true,id:true,key:true,replacedWith:true
	,clearWhenEmpty:true,collapsed:true,widgetNode:true,atomic:true,handle:true}; //don't know id exists

var clearAllMarks=function(doc){
	var marks=doc.getAllMarks();
	for (var i in marks) {
		marks[i].clear();
	}
}

var applyBookmark=function(cm,bookmark) {
	var func="bookmark_"+bookmark.className;
	if (cm.react && cm.react[func]) {
		cm.getDoc().setCursor({line:bookmark.from[1] ,ch:bookmark.from[0]});
		return cm.react[func].call(cm.react,bookmark);
	}
	return null;
}

var json2textMarker=function(cm,key,m) {
	var fromch=m.from[0],fromline=m.from[1];

	if (typeof m.to==="undefined") {
		m.key=key;
		applyBookmark(cm,m).handle;
		return;
	}

	if (typeof m.to==="number") {
		toch=m.to;
		toline=fromline;
	}  else {
		toch=m.to[0];
		toline=m.to[1];
	}

	for (var i in m) {
		if (reservedfields[i]) delete m[i];
	}
	m.key=key; //probably from firebase uid
	m.handle=cm.markText({line:fromline,ch:fromch},{line:toline,ch:toch}, m );
}
var applyMarkups=function(cm,markups,clear) {
	if (clear) clearAllMarks(cm.getDoc());
	for (var key in markups) {
		if (markups[key].handle) continue; //already in view
		var m=markups[key];
		json2textMarker.call(this,cm,key,m);
	}
}

/**
	extract markups from CodeMirror
*/
var extractBookmark=function(textmarker, pos) {
	var out={from:[pos.ch,pos.line]};
	for (var i in textmarker) {
		if (typeof textmarker[i]==="function") continue;
		if (!reservedfields[i]) out[i]=textmarker[i];
	}
	return out;
}

var textMarker2json=function(m) {
	if (m.clearOnEnter) return; //temporary markup will not be saved
	var obj={};

	for (var key in m) {
		if (!m.hasOwnProperty(key))continue;
		if (!reservedfields[key] && key[0]!=="_") { //key start with _ will not saved
			obj[key]=m[key];
			if (key==="className"&& m[key].indexOf("editingMarker")>-1) {//should not save this class
				obj[key]=obj[key].replace(/ ?editingMarker ?/,"");
			}
		}
	}

	//overwrite from and to
	var pos=m.find();
	if (m.type==="bookmark") {
		obj=extractBookmark(m,pos);
	} else {
		obj.from=[pos.from.ch,pos.from.line];
		if (pos.to) {
			obj.to=pos.to.ch;
			if (pos.from.line!==pos.to.line) to=[to,pos.to.line];
		} else {
			//console.error("markup missing to");
		}
	}	
	return obj;
}
var extractMarkups=function(doc) {
	var marks=doc.getAllMarks();
	var markups={};
	for (var i=0;i<marks.length;i++) {
		var m=marks[i];

		var obj=textMarker2json(m);
		if (obj) markups[m.key]=obj;		
	}
	return markups;
}

module.exports={applyMarkups:applyMarkups, extractMarkups:extractMarkups,
	json2textMarker:json2textMarker,textMarker2json:textMarker2json};