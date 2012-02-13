'use strict';

var canvas = id('canvas');
preventSelection(canvas);

var renderer = new Renderer(canvas);
var gl = renderer.gl_;

var simpleVsrc = id('SIMPLE_VERTEX_SHADER').text;
var simpleFsrc = id('SIMPLE_FRAGMENT_SHADER').text;
renderer.program_ = new Program(gl, [vertexShader(gl, simpleVsrc),
                                     fragmentShader(gl, simpleFsrc)]);
renderer.program_.use();
renderer.program_.enableVertexAttribArrays(DEFAULT_VERTEX_FORMAT);

gl.activeTexture(gl.TEXTURE0);
gl.uniform1i(renderer.program_.set_uniform.u_diffuse_sampler, 0);

// TODO: instead of having these callbacks reach into Renderer's
// internal state, factor such state into a single manager. This will
// be useful for things like serialization and simulation.
mat4.translate(renderer.view_, [0, -0.5, -3]);

function onDrag(dx, dy) {
  var model = renderer.model_;
  mat4.translate(model, [0, -2*dy/canvas.clientHeight, 0.0], model);
  mat4.rotate(model, 10*dx / canvas.clientWidth, [0, 1, 0], model);

  // renderer.scaleX = dx ? 0.5 : 1.0;
  // renderer.scaleY = dy ? 0.5 : 1.0;

  renderer.postRedisplay();
};

addDragHandler(canvas, onDrag);

function ndcFromEvent(evt) {
  return [2*evt.clientX/canvas.clientWidth-1,
          1-2*evt.clientY/canvas.clientHeight, 0, 1];
}

var projInv = mat4.create();
var eyeFromEvt = new Float32Array(4);  // TODO: vec4.

function eyeFromNdc(ndcXY) {
  mat4.inverse(renderer.proj_, projInv);  // TODO: adjoint.
  mat4.multiplyVec4(projInv, ndcXY, eyeFromEvt);
  return eyeFromEvt;
}

addWheelHandler(window, function(dx, dy, evt) {
  var WHEEL_SCALE = 1.0/200;
  var view = renderer.view_;
  eyeFromNdc(ndcFromEvent(evt));
  vec3.scale(eyeFromEvt, -WHEEL_SCALE*dy);
  mat4.translate(view, eyeFromEvt);
  mat4.translate(view, [WHEEL_SCALE*dx, 0, 0]);
  renderer.postRedisplay();
  return false;
});

function textureFromMaterial(gl, material, callback) {
  try {
    var url = MATERIALS[material].map_Kd;  // throw-y.
    if (url === undefined) {
      throw url;
    }
    return textureFromUrl(gl, url, callback);
  } catch (e) {
    var color;
    try {
      color = new Uint8Array(MATERIALS[material].Kd);
    } catch (e) {
      color = new Uint8Array([255, 255, 255]);
    }
    var texture = textureFromArray(gl, 1, 1, color);
    callback(gl, texture);
    return texture;
  }
}

function onLoad(attribArray, indexArray, bboxen, meshEntry) {
  var texture = textureFromMaterial(gl, meshEntry.material, function() {
    renderer.postRedisplay();
  });
  var mesh = new Mesh(gl, attribArray, indexArray, DEFAULT_VERTEX_FORMAT,
                      texture, meshEntry.names, meshEntry.lengths, bboxen);
  renderer.meshes_.push(mesh);
}
