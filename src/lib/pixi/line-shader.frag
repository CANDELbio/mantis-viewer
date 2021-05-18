varying vec2 uv;
varying vec4 vColor;
varying float vThickness;
uniform vec4 tint;

uniform sampler2D target;

void main()
{
	float edge = abs((uv.y - 0.5) * 2.);
	float feather = 4.;

	float thing = (vThickness - feather)/vThickness;

	float diff = (edge-thing);
	float featherValue = edge - (1.-diff);

	featherValue /= diff;
	featherValue = smoothstep(0., 1., featherValue);
	featherValue *= step(thing, edge);

    gl_FragColor = vec4(1., 1., 1., 1.-featherValue) * vColor * tint;
}