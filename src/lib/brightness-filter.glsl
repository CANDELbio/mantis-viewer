varying vec2 vTextureCoord;
varying vec4 vColor;

uniform sampler2D uSampler;
uniform vec4 uTextureClamp;
uniform vec4 uColor;

uniform float transformMin;
uniform float transformMax;

void main(void)
{
    gl_FragColor = texture2D(uSampler, vTextureCoord);
    // Probably a more concise way to do this, but I'm not sure how.
    // Math borrowed from sample_and_apply_sliders in https://github.com/hms-dbmi/viv/blob/master/src/layers/XRLayer/shader-modules/channel-intensity.glsl
    gl_FragColor.r = clamp((gl_FragColor.r - transformMin) / max(0.0005, (transformMax - transformMin)), 0.0, 1.0);
    gl_FragColor.g = clamp((gl_FragColor.g - transformMin) / max(0.0005, (transformMax - transformMin)), 0.0, 1.0);
    gl_FragColor.b = clamp((gl_FragColor.b - transformMin) / max(0.0005, (transformMax - transformMin)), 0.0, 1.0);
}