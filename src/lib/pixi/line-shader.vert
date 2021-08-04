attribute vec2 position;
attribute float direction;
attribute vec2 next;
attribute vec2 prev;
attribute vec4 color;

varying vec2 uv;
varying float vThickness;
varying vec4 vColor;

uniform mat3 translationMatrix;
uniform mat3 projectionMatrix;
uniform float time;
uniform float thickness;
uniform float uDivisor;

void main()
{
	vColor = color;
	vColor.rgb *= vColor.a;
	
	vec2 nextScreen = next; 
    vec2 posScreen = position;
  	vec2 prevScreen = prev;

  	vec2 dir;

  	if (posScreen == prevScreen)
    {
		dir = normalize(nextScreen - posScreen);
	}
	else if (posScreen == nextScreen)
	{
		dir = normalize(posScreen - prevScreen);
	}
	else
	{
		//get directions from (C - B) and (B - A)
	    vec2 dirA = normalize((posScreen - prevScreen));
		vec2 dirB = normalize((nextScreen - posScreen));
		dir = normalize(dirA + dirB);
	}

	vec2 normal = vec2(-dir.y, dir.x);

	posScreen += normal * direction * thickness;

	float d = sign(direction);
	d += 1.;
	d *= 0.5;

	uv = vec2(1., d );
	uv.x /= uDivisor;
	

	vThickness = abs(direction * thickness);

	gl_Position = vec4((projectionMatrix * translationMatrix * vec3(posScreen, 1.0)).xy, 0.0, 1.0);
}