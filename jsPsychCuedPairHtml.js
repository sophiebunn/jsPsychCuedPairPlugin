var jsPsychCuedPairHtml = (function (jspsych) {
    "use strict";

    const info = {
        //parameter definitions
        name: "cued-html",
        parameters: {
            Cue: {
                type: jspsych.ParameterType.HTML_STRING,
                pretty_name: "Cue",
                default: null,
            },
            Target: {
                type: jspsych.ParameterType.HTML_STRING,
                pretty_name: "Target",
                default: null,
            },
            Condition: {
                type: jspsych.ParameterType.INT,
                pretty_name: "Condition",
                default: 0,
            },
            Trial_Duration: {
                type: jspsych.ParameterType.INT,
                pretty_name: "Trial Duration",
                default: 10000,
            },
            Mistakes_Allotted: {
                type: jspsych.ParameterType.INT,
                pretty_name: "Mistakes Allotted",
                default: 0,
            },
        },
    };

    class jsPsychCuedPairHtmlPlugin {
        //init jsPsych
        constructor(jsPsych) { 
            this.jsPsych = jsPsych;
        }

        //trial function to run thru timeline
        trial(display_element, trial) {
            //variable declaration
            var html = "";
            var timer_interval;
            var last_time_key_pressed = performance.now();

            var keys_pressed = [];
            var key_pressed_string = "";

            var key_press_interval_array = [];
            var key_press_interval = 0;


            //if restudy then display both words
            if (trial.Condition !== 1) {
                html += `<p style="font-size: 70px; font-family: monospace;">${trial.Cue}    -    <u>${trial.Target}</u></p>`;
            }
            //if recall then only display cue word
            else {
                html += `<p style="font-size: 70px; font-family: monospace;">${trial.Cue}    -     <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u></p>`;
            }
            //design fun
            html += '<br><br>';
            html += `<span id="cued-form" style="font-size: 50px;"></span>`;
            html += '<br><br>';
            html += '<br><br>';
  
            html += `<span id="cued-timer" style="font-size: 50px;"></span>`;

            display_element.innerHTML = html;

            //add timer to html func call
            startCountdown();

            display_element.querySelector("#jspsych-cued-html")

            //runs when a key is pressed
            var after_key_response = function(info) {
                //string which holds final input post backspaces and more
                key_pressed_string = stringify(info.key, key_pressed_string);
                
                //managing key press time array
                key_press_interval = (performance.now() - last_time_key_pressed);
                last_time_key_pressed = performance.now();

                key_press_interval_array.push(key_press_interval);

                //update key pressed string!
                if (key_pressed_string !== null)
                {
                    display_element.querySelector("#cued-form").textContent = `${key_pressed_string}`;
                }
            };

            //functinon to add key pressed to spring accounting for funny characters
            function stringify(key_pressed, key_pressed_string) {
                var return_string = key_pressed_string;

                //if backspace delete
                if (key_pressed == 'backspace') {
                    return_string = return_string.substring(0, return_string.length - 1);
                }
                //make sure is an actual char, not like enter or control
                else if (key_pressed.length == 1) {
                    return_string += key_pressed;
                }

                //add to key input array
                keys_pressed.push(key_pressed);
                return return_string;
            };

            //uses levenshteins distance function to assess accuracy thru arrays
            function levenshteinDistance(a, b) {
                const matrix = [];
                for (let i = 0; i <= b.length; i++) {
                    matrix[i] = [i];
                }
                for (let j = 0; j <= a.length; j++) {
                    matrix[0][j] = j;
                }

                for (let i = 1; i <= b.length; i++) {
                    for (let j = 1; j <= a.length; j++) {
                        if (b.charAt(i - 1) === a.charAt(j - 1)) {
                            matrix[i][j] = matrix[i - 1][j - 1];
                        } else {
                            matrix[i][j] = Math.min(
                                matrix[i - 1][j - 1] + 1, // substitution
                                matrix[i][j - 1] + 1,     // insertion
                                matrix[i - 1][j] + 1      // deletion
                            );
                        }
                    }
                }

                return matrix[b.length][a.length];
            }

            //assesses the accuracy of two strings using levenshteins dist func.
            function accuracyCheck(str1, str2) {
                var len1 = str1.length;
                var len2 = str2.length;
                var maxLen = Math.max(len1, len2);
                
                var distance = levenshteinDistance(str1, str2);

                if (distance <= trial.Mistakes_Allotted) {
                    distance = 0;
                }
                var accuracy = ((maxLen - distance) / maxLen) * 100;
                return accuracy.toFixed(2);
            }

            //starts the countdown to be seen on bottom screen
            function startCountdown() {                
                timer_interval = setInterval(() => {
                    const remaining = trial.Trial_Duration - (performance.now() - start_time);
                    let minutes = Math.floor(remaining / 1000 / 60);
                    let seconds = Math.ceil((remaining - minutes * 1000 * 60) / 1000);
                    if (seconds == 60) {
                        seconds = 0;
                        minutes++;
                    }
                    const minutes_str = minutes.toString();
                    const seconds_str = seconds.toString().padStart(2, "0");
                    display_element.querySelector("#cued-timer").textContent = `${minutes_str}:${seconds_str}`;
                    
                    if (remaining <= 0) {
                        display_element.querySelector("#cued-timer").textContent = `${minutes_str}:${seconds_str}`;
                        clearInterval(timer_interval);
                    }
                }, 250);
            };

            //assesses key presses/starts keyboard listener.
            jsPsych.pluginAPI.getKeyboardResponse({
                callback_function: after_key_response,
                valid_responses: "ALL_KEYS",
                rt_method: 'performance',
                persist: true
            });

            //data collection and trial timer set.
            this.jsPsych.pluginAPI.setTimeout(() => {
                var question_data = key_pressed_string;
                var key_presses = keys_pressed;
                var key_press_times = key_press_interval_array;

                var combined_wp = trial.Cue.toLowerCase() + " " + trial.Target.toLowerCase();

                var accuracy = accuracyCheck(combined_wp, question_data);

                jsPsych.pluginAPI.cancelAllKeyboardResponses();

                if (trial.Condition == 0) {
                    var study = "Restudy";
                }
                else {
                    var study = "Retrieval";
                }
                var trialdata = {
                    cued_pair: trial.Cue.toUpperCase() + "-" + trial.Target.toUpperCase(),
                    accuracy: accuracy,
                    study_type: study,
                    response: question_data,
                    key_press_intervals: key_press_times,
                    all_keys_pressed: key_presses,
                };

                display_element.innerHTML = "";
                // next trial
                jsPsych.finishTrial(trialdata);
            }, trial.Trial_Duration);
            

            var start_time = performance.now();
        }
    }
    jsPsychCuedPairHtmlPlugin.info = info;
    return jsPsychCuedPairHtmlPlugin;

})(jsPsychModule);