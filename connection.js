const mongoose = require('mongoose');

function mongoconnect(url){
    mongoose.connect(url).then(()=>{
        console.log(`database connected on ${url}`);
    })
}


module.exports ={
    mongoconnect
}