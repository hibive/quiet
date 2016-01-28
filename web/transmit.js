var SampleEncoder = SampleEncoder || {};

var Module = {
    onProfilesFetch: function(profiles) {
        var audio_ctx = new (window.AudioContext || window.webkitAudioContext)();
        console.log(audio_ctx.sampleRate);

        var c_profiles = intArrayFromString(profiles);
        var c_profilename = intArrayFromString("main");
        var opt = ccall('get_encoder_profile_str', 'pointer', ['array', 'array'], [c_profiles, c_profilename]);
        var encoder = ccall('create_encoder', 'pointer', ['pointer'], [opt]);

        var padding = [];
        while(padding.length < 256) {
            padding.push('pad');
        }
        var payloadarray = [];
        while(payloadarray.length < 1024) {
            payloadarray.push(payloadarray.length + '<br>');
        }
        var payload_str = padding.join('') + payloadarray.join('');
        payload_str = payload_str.repeat(2);
        var payload = allocate(intArrayFromString(payload_str), 'i8', ALLOC_NORMAL);
        ccall('encoder_set_payload', 'number', ['pointer', 'pointer', 'number'], [encoder, payload, payload_str.length]);

        var sample_len = 16384;
        var samples = ccall('malloc', 'pointer', ['number'], [4 * sample_len]);
        var sample_view = HEAPF32.subarray((samples/4), (samples/4) + sample_len);

        var script_processor = audio_ctx.createScriptProcessor || audio_ctx.createJavaScriptNode
        var transmitter = script_processor.call(audio_ctx, sample_len, 1, 2);
        transmitter.onaudioprocess = function(e) {
            var output_offset = 0;
            var output_l = e.outputBuffer.getChannelData(0);
            var written = ccall('encode', 'number', ['pointer', 'pointer', 'number'], [encoder, samples, sample_len]);
            output_l.set(sample_view);
            if (written < sample_len) {
                output_l.fill(0, written);
            }
        };


        setTimeout(function() {
            transmitter.connect(audio_ctx.destination);
        }, 5000);


        //ccall('destroy_encoder', null, ['pointer'], [encoder]);

    },
    onRuntimeInitialized: function() {
        var xhr = new XMLHttpRequest();
        xhr.overrideMimeType("application/json");
        xhr.open("GET", "profiles.json", true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && xhr.status == "200") {
                Module.onProfilesFetch(xhr.responseText);
            }
        };
        xhr.send(null);
    }
};
