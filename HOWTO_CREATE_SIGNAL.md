# How to generate a signal definition

If you want to build an app for your 433/868 device the first thing you need to do is define the signal definition for your device.
A signal definition defines the properties of the signal from your device where Homey will listen for. The most important aspects
of a signal definition are the sof (start of frame), eof (end of frame) and words which together define the data in the signal.

You can use Homey to record 433 or 868 signals by calling the following api method:
`POST => '/manager/microcontroller/record', { frequency: '433', time: 10 }`

The options in the POST data above are the default options. Because you have to be authorized to do calls to the Homey api, 
the most easy way to execute this post command is by calling it from the homey UI when your logged in, for instance in the 
chrome developer console: 
`var recordData; api('POST', '/manager/microcontroller/record', {}, (result) => {console.log('done recording'); recordData = result; });`

While Homey is recording you should generate as much data from your device as possible to get the best result. Preferably all
signals should be the same (for instance the same button on a remote) because this will make the manual stap of decoding the signal
more easy.

When the recording is done the data will be stored in the variable `recordData`. We should first filter out the obvious noise from the result.
The most common way to filter out noise and invalid recordings of the signal is to throw away all data except the entries with the most common length.
To do this we will use 2 commands. The first command will output the distribution of the lengths in `recordData`:
`recordData.reduce((lengths, recordEntry) => Object.assign(lengths, { [recordEntry.length]: (lengths[recordEntry.length] || 0) + 1 }), {});`

The second command will filter the result to the length that is most occurring (Note, you should replace `%fl%` with the most common length manually):
`var fl = %fl%; recordData = recordData.filter(recordEntry => recordEntry.length === fl)`

Now that recordData only contains the data from the device we need to manually look for the sof, eof and words. You can do this by just looking
at the first entry of recordData. The following features should be recognisable in the data:

### Start of frame
The first part of your signal contains the start of frame. The start of frame are a number of values at the beginning of each frame
that indicate the signal is coming from your device. These values will be the same for all signals from the device. 
Note that some devices do not send a start of frame signal and the frame immediately starts with the words.

### Words
After the start of frame part you will find the data of the signal. The data is most often send by using two words (indicating 0 and 1).
Words consist of 2-6 subsequent values that are repeated for each 1 or 0 of data. A different configuration of words for the same signal
can indicate a different button press, a temperature change, if motion is detected or something else depending on your device.

### End of frame
The last part of your signal will often contain a end of frame part. This is often 1 value (although it is possible that it consists of more than 1 value)
that indicates that the device is done sending data. This value will be the same for all signals from the device.
Note that some devices do not send a end of frame signal and the frame will end with a word.

### Example
For example, we have done the above steps of recording and filtering the data and we now have the following data:
```
recordData = [
    [255, 400, 110, 1002, 1100, 111, 108, 1010, 102, 1004, 1089, 109, 1102, 112, 110, 1004, 230],
    ...
]
```
The data above shows a signal with start of frame data, words and end of frame data. I will explain how to get the values from this data in the reverse order
since for each step you will need to know how the next step is performed to generate the best signal definition.

#### defining the eof (end of frame)
The eof is the part of the signal that remains after parsing the words. This part does only indicate that the frame has ended and does not contain any data.

#### defining words
Words should be defined as small as possible without increasing the amount of needed words. You define words by starting at the first value after the
start of frame and assign all values to a word of your wanted length until there are not enough values left to create a word.
For instance if we use `sof = [255, 400]` for the example data above and start with a word length of 2 we would get the words `[110, 1002]` and `[1100, 111]`.
If we would use a word length of 3 we would get the words `[110, 1002, 1100]`, `[111, 108, 1010]`, `[109, 1102, 112]` which are more words and represent less data.
If you created a extra word that is only used at the very end of the frame you can consider adding it to the eof since it would probably not contain usable data.

#### defining the sof (start of frame)
You should define a sof that is as small as possible but should not increase the amount of words of the signal. 
If we define `sof = [255]` we will need to define 7 words to parse the signal:
`[400, 110]`, `[1000, 1100]`, `[111, 108]`, `[1010, 102]`, `[1004, 1089]`, `[109, 1102]` and `[1004, 230]` and the parsed data would be `01234526`

If we define `sof = [255, 400]` we can define 2 words to parse the signal:
`[110, 1002]`, `[1100, 111]` and the parsed data would be `0100110` 

If we define `sof = [255, 400, 110]` we need to use 6 words which is clearly worse than `sof = [255, 400]`

If we define `sof = [255, 400, 110, 1002]` we have the same 2 words as `sof = [255, 400]` 
but 1 bit of data is now discarded since it is considered to be a part of the start of frame (which would make the parsed data `100110`). 

### Generating the signal definition
Now that we know the sof, words and eof of our signal we need to calculate averages of our measurement to use in the signal definition.
We can calculate the average sof and eof by the following commands (Note, you should replace `%sofl%` and `%eofl%` with the length of the sof/eof):
`var sofl = %sofl%; var sof = recordData.map(recordEntry => recordEntry.slice( 0, sofl )).reduce((result, recordEntrySof) => recordEntrySof.map((timing, index) => (result[index] || 0) + timing)).map(timing => Math.round(timing / recordData.length));`
`var eofl = %eofl%; var eof = recordData.map(recordEntry => recordEntry.slice(-1 * eofl)).reduce((result, recordEntryEof) => recordEntryEof.map((timing, index) => (result[index] || 0) + timing)).map(timing => Math.round(timing / recordData.length));`

Now that we have the sof and eof we can calculate the averages of the words For this we execute the 2 commands below.
(Note. you should replace %word0% and %word1% with the guesstimated words e.g. `[110, 1000]` and `[1100, 110]`. The tolerance indicates how close the word should match your guesstimated word.)
`var predictedWords = [%word0%, %word1%]; var tolerance = 100;`
`var words = [].concat.apply([], recordData.map(recordEntry => recordEntry.slice(sofl, -1 * eofl))).reduce((result, measurement, index, arr) => {if(index % predictedWords[0].length === 0) {var wordIndex = predictedWords.findIndex(word => word.every((timing, timingIndex) => Math.abs(arr[index + timingIndex] - timing) < tolerance));	if(wordIndex !== -1){ result[wordIndex].push(arr.slice(index, index + predictedWords[0].length)); } } return result; }, new Array(predictedWords.length).fill(null).map(() => [])).map((word) => word.reduce((result, arr) => arr.map((timing, index) => result[index] + timing), new Array(predictedWords.length).fill(0)).map(timing => Math.round(timing / word.length)));`

Now we have all data we need and we can insert them in the signal definition object that homey uses. You can print a handy object with the following command:
`var length = (recordData[0].length - sofl - eofl) / words[0].length; console.log(JSON.stringify({sof, eof, words, interval: 10000, sensitivity: 0.7, repetitions: 20, minimalLength: length, maximalLength: length}, null, '\t').replace(/"/g, '\''));`