let ID = 1;

function fillArrayBuffer_DataView(block) {
    for (let i = 0; i < block.uniformsList.length; i++) {
        const uniform = block.uniformsList[i];
        if (uniform.baseType === 'FLOAT_32') {
            for (let j = 0; j < uniform.value.length; j++) {
                block.dataView.setFloat32(uniform.blockOffset + j * Float32Array.BYTES_PER_ELEMENT, uniform.value[j], true);
            }
        }
        else {
            for (let j = 0; j < uniform.value.length; j++) {
                block.dataView.setInt32(uniform.blockOffset + j * Int32Array.BYTES_PER_ELEMENT, uniform.value[j], true);
            }
        }
    }
}

function fillArrayBuffer_TypedArray(block) {
    for (let i = 0; i < block.uniformsList.length; i++) {
        const uniform = block.uniformsList[i];
        block.dataFloat32.set(uniform.value, uniform.blockOffset / Float32Array.BYTES_PER_ELEMENT);
    }
}

const USE_DATAVIEW = true;
const fillArrayBuffer = USE_DATAVIEW ? fillArrayBuffer_DataView : fillArrayBuffer_TypedArray;
console.info('Use fill method:', USE_DATAVIEW ? 'DataView' : 'TypedArray');

export class UniformBlock {
    constructor(gl, { name, size, uniforms } = {}) {
        this.gl = gl;
        this.id = ID++;
        this.bufferIndex = -1;
        this.name = name;
        this.uniformsList = uniforms;
        this.uniformsByName = uniforms.reduce((obj, val) => ((obj[val.uniformName] = val), obj), {});
        this.size = size;
        this.data = new ArrayBuffer(size);
        this.dataView = new DataView(this.data);
        this.dataFloat32 = new Float32Array(this.data);
        this.needsUpdate = false;

        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
        gl.bufferData(gl.UNIFORM_BUFFER, size, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);

        this.glState = this.gl.renderer.state;
    }

    bind(bufferIndex = 0) {
        if (this.glState.uniformBufferBindings[bufferIndex] === this.id) {
            return;
        }

        const gl = this.gl;
        this.bufferIndex = bufferIndex;
        this.glState.uniformBufferBindings[bufferIndex] = this.id;
        gl.bindBufferBase(gl.UNIFORM_BUFFER, this.bufferIndex, this.buffer);
    }

    setFieldValue(name, value) {
        this.needsUpdate = true;
        this.uniformsByName[name].value = value;
    }

    commit() {
        if (!this.needsUpdate) return;
        const gl = this.gl;
        fillArrayBuffer(this);

        gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
        gl.bufferData(gl.UNIFORM_BUFFER, this.data, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);
        this.needsUpdate = false;
    }
}
