const lignator = require('lignator')
const formidable = require('formidable')
const extract = require("extract-zip")
const zipper = require('zip-local')
const XLSX = require('xlsx')
global.storage = require("./storage.js");
//TIME OUT
const minutes = 15
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs))

//-----------------------------------------------login page call------------------------------------------------------
exports.login = function (req, res) {
    var message = ''

    if (req.method == "POST") {
        var post = req.body
        var user = post.user_name
        var pass = post.password
        if (!/^[a-z0-9]+$/.test(user) || !/^[A-Za-z0-9\d=!\-@._*]*$/.test(pass)) { // check user or pass is valid
            message = 'Incorrect username or password'
            res.render('index.ejs', { message: message })
            return;
        }
        var role = (post.role == "Student") ? "student_account" : "teacher_account" // select type account
        var crypto = require('crypto')
        var hash = crypto.createHash('md5').update(pass).digest("hex") // encrypt pass md5
        var ipaddress = (req.headers['x-forwarded-for'] || // get ip address
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress).split(",")[0]
        var sql = ""
        if (role == "student_account") { // if student
            var sql = "SELECT id, username FROM `" + role + "` WHERE (`username`='" + user + "' and password = '" + hash + "' and ip='" + ipaddress + "') or (`username`='" + user + "' and password = '" + hash + "' and " + new Date().getTime() + " >= ROUND(UNIX_TIMESTAMP(timeout) * 1000) and islogin=0)"
            db.query(sql, function (err, results) {
                if (err) { res.redirect("/error"); return }
                if (results.length) {
                    req.session.userId = results[0].id
                    req.session.role = post.role
                    req.session.user = results[0].username
                    req.session.ipaddress = ipaddress
                    // record ip and timeout
                    sql = "UPDATE student_account SET `ip`='" + ipaddress + "',`timeout`='" + new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000) + minutes * 60000).toISOString().substring(0, 19) + "', `islogin`=1 WHERE `id`=" + results[0].id
                    db.query(sql)
                    res.redirect('/home/dashboard')
                } else {
                    message = 'Incorrect username or password'
                    res.render('index.ejs', { message: message })
                }
            })

        } else { // teacher
            sql = "SELECT id, username, rollnumber FROM `" + role + "` WHERE `username`='" + user + "' and password = '" + hash + "'"
            db.query(sql, function (err, results) {
                if (err) { res.redirect("/error"); return }
                if (results.length) {
                    req.session.userId = results[0].id
                    req.session.role = post.role
                    req.session.user = results[0].username
                    req.session.teacher_rollnumber = results[0].rollnumber
                    req.session.ipaddress = ipaddress

                    res.redirect('/home/dashboard')
                } else {
                    message = 'Incorrect username or password'
                    res.render('index.ejs', { message: message })
                }

            })
        }
    } else {
        res.render('index.ejs', { message: message })
    }

}
//-----------------------------------------------dashboard page functionality----------------------------------------------

exports.dashboard = function (req, res, next) {
    var userId = req.session.userId,
        role = (req.session.role == "Student") ? "student_account" : "teacher_account"
    console.log('ddd=' + userId + ' ' + role)
    if (userId == null) {
        res.redirect("/login")
        return
    }
    res.render('dashboard.ejs', { role: req.session.role, user: req.session.user })

}
//------------------------------------logout functionality----------------------------------------------
exports.logout = function (req, res) {
    if (req.session.role == "Student") { // update record ip address and time out
        var sql = "UPDATE student_account SET `ip`='" + req.session.ipaddress + "',`timeout`='" + new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000) + minutes * 60000).toISOString().substring(0, 19) + "', `islogin`=0 WHERE `id`=" + req.session.userId
        db.query(sql)
    }
    console.log(req.session.user + " has disconected")
    req.session.destroy(function (err) {
        res.redirect("/login")
    })
}
//--------------------------------render user details after login--------------------------------
exports.profile = function (req, res) {
    var userId = req.session.userId,
        role = (req.session.role == "Student") ? "student_account" : "teacher_account"
    if (userId == null) {
        res.redirect("/login")
        return
    }
    var sql = "SELECT name FROM `" + role + "` WHERE `id`='" + userId + "'"
    db.query(sql, function (err, result) {
        if (err) { res.redirect("/error"); return }
        res.render('profile.ejs', { data: result, role: req.session.role, user: req.session.user })
    })
}

//---------------------------------contest----------------------------------
exports.contest = function (req, res) {
    var userId = req.session.userId
    if (userId == null) {
        res.redirect("/login")
        return
    }
    var teacher_rollnumber = req.session.teacher_rollnumber
    var sql = "SELECT contest_id, contest_name, time_begin, time_end, DATE_FORMAT(time_begin, '%d-%m-%Y %H:%i:%s') as time_begin1, DATE_FORMAT(time_end, '%d-%m-%Y %H:%i:%s') as time_end1 FROM `contest` WHERE `teacher_rollnumber`='" + teacher_rollnumber + "' AND `deleted`=0"
    db.query(sql, function (err, results) {
        if (err) { res.redirect("/error"); return }
        res.render('contest.ejs', { data: results, role: req.session.role, user: req.session.user })
    })
}
//---------------------------------Add a new contest----------------------------------
exports.add_contest = function (req, res) {
    var userId = req.session.userId
    if (userId == null) {
        res.redirect("/login")
        return
    }
    if (req.method == "POST") {
        var teacher_rollnumber = req.session.teacher_rollnumber
        var post = req.body
        var contest_name = post.contest_name
        var starttime = post.starttime
        var endtime = post.endtime
        // create 4 folder when add new contest
        if (!fs.existsSync(storage.BAILAM + contest_name)) {
            fs.mkdirSync(storage.BAILAM + contest_name)
        }
        if (!fs.existsSync(storage.DEBAI + contest_name)) {
            fs.mkdirSync(storage.DEBAI + contest_name)
        }
        if (!fs.existsSync(storage.TESTCASE + contest_name)) {
            fs.mkdirSync(storage.TESTCASE + contest_name)
        }
        if (!fs.existsSync(storage.NOPBAI + 'Logs/' + contest_name)) {
            fs.mkdirSync(storage.NOPBAI + 'Logs/' + contest_name)
        }
        // add contest to db
        var sql = "INSERT INTO `contest`(`contest_name`, `teacher_rollnumber`, `time_begin`, `time_end`) VALUES ('" + contest_name + "', '" + teacher_rollnumber + "', '" + starttime + "', '" + endtime + "')"
        db.query(sql, function (err, results) {
            res.redirect("/contest")
        })
    } else {
        res.redirect("/error")
        return
    }
}
//---------------------------------Delete a contest----------------------------------
exports.delete_contest = function (req, res) {
    var userId = req.session.userId
    if (userId == null) {
        res.redirect("/login")
        return
    }
    if (req.method == "POST") {
        var post = req.body
        var contest_id = post.contest_id
        var sql = ""
        try {
            // update status contest.deleted=1, student_account.in_contest=0
            sql = "UPDATE contest SET deleted=1 WHERE contest_id=" + contest_id
            db.query(sql);
            sql = "UPDATE student_account SET contest_id=0 WHERE contest_id=" + contest_id
            db.query(sql)
            sleep(500).then(() => {
                res.redirect("/contest")
            })
        } catch (error) {
            res.redirect("/error")
            return
        }
    } else {
        res.redirect("/error")
        return
    }
}
//---------------------------------Edit a contest----------------------------------
exports.edit_contest = function (req, res) {
    var userId = req.session.userId
    if (userId == null) {
        res.redirect("/login")
        return
    }
    if (req.method == "POST") {
        var post = req.body
        var contest_id = post.contest_id
        var contest_name = post.contest_name
        var time_begin = post.time_begin
        var time_end = post.time_end
        // update contest_name, time_begin, time_end
        var sql = "UPDATE `contest` SET `contest_name`='" + contest_name + "',`time_begin`='" + time_begin + "',`time_end`='" + time_end + "' WHERE `contest_id`=" + contest_id
        db.query(sql, function (err, results) {
            if (err) { res.redirect("/error"); return }
            res.redirect("/contest/detail?contest_id=" + contest_id)
        })
    } else {
        res.redirect("/error")
        return
    }
}
//---------------------------------Download a contest----------------------------------
exports.download = function (req, res) {
    var userId = req.session.userId
    if (userId == null) {
        res.redirect("/login")
        return
    }
    var contest_id = req.query.contest_id
    var sql = "SELECT contest_name from contest WHERE `contest_id`=" + contest_id
    db.query(sql, function (err, results) {
        if (err) { res.redirect("/error"); return }
        var contest_name = results[0].contest_name
        // zip folder "./public/thumucbailam/ contest_name
        zipper.sync.zip(storage.BAILAM + contest_name).compress().save(contest_name + ".zip")
        var file = contest_name + ".zip"
        res.download(file) // download file .zip
    })
}
//---------------------------------contest-detail-get----------------------------------
exports.contest_detail = function (req, res) {
    var userId = req.session.userId
    var contest_id = req.query.contest_id
    if (userId == null) {
        res.redirect("/login")
        return
    }
    if (contest_id == null) {
        res.redirect("/contest")
        return
    }
    var message = ""
    if (req.session.deleted) { // check student is deleted in contest
        req.session.deleted = false
        message = "Succesfully! Students have been deleted."
    }
    var sql = "SELECT student_account.id, student_account.rollnumber, student_account.name, student_account.class, contest.contest_id, contest.contest_name,contest.time_begin,contest.time_end, DATE_FORMAT(contest.time_begin, '%d-%m-%Y %H:%i:%s') as time_begin1, DATE_FORMAT(contest.time_end, '%d-%m-%Y %H:%i:%s') as time_end1 FROM contest " +
        "INNER JOIN student_account ON student_account.contest_id=contest.contest_id " +
        "WHERE contest.contest_id=" + contest_id
    db.query(sql, function (err, results) {
        if (err) { res.redirect("/error"); return }
        if (results.length == 0) { // if no student in contest
            sql = "SELECT contest_name, contest_id, time_begin, time_end, DATE_FORMAT(time_begin, '%d-%m-%Y %H:%i:%s') as time_begin1, DATE_FORMAT(time_end, '%d-%m-%Y %H:%i:%s') as time_end1  FROM contest WHERE contest_id=" + contest_id
            db.query(sql, function (err, results) {
                res.render('contest-detail.ejs', { data: results, message: message, role: req.session.role, user: req.session.user })
            })
        } else { // at least 1 student
            res.render('contest-detail.ejs', { data: results, message: message, role: req.session.role, user: req.session.user })
        }

    })

}
//---------------------------------delete selected user----------------------------------
exports.delete_user = function (req, res) {
    var userId = req.session.userId
    if (userId == null) {
        res.redirect("/login")
        return
    }
    if (req.method == "POST") {
        var post = req.body
        var list_rollnumber = post.list_rollnumber
        var contest_id = post.contest_id
        if (list_rollnumber != "") { // // if has student in deleted list
            var list = list_rollnumber.split(",")
            var sql = "UPDATE student_account SET contest_id=0 WHERE "
            // update contest_id=0 in student_account
            for (let i = 0, l = list.length; i < l; ++i) {
                sql += "rollnumber='" + list[i] + "' OR "
            }
            sql = sql.slice(0, -4)
            db.query(sql)
            req.session.deleted = true
        }
        sleep(500).then(() => {
            res.redirect("/contest/detail?contest_id=" + contest_id)
        })
    } else {
        res.redirect("/error")
        return
    }
}
//---------------------------------load user----------------------------------
exports.load_user = function (req, res) {
    var userId = req.session.userId
    if (userId == null) {
        res.redirect("/login")
        return
    }
    var message = ""
    var error = ""
    var warning = ""
    if (req.session.added) {
        req.session.added = false
        message = "Succesfully! Students have been added."

    }
    var class_name = req.query.class_name
    var contest_id = req.query.contest_id
    var sql = "SELECT rollnumber, name, class FROM student_account WHERE class='" + class_name + "' and contest_id=0"
    db.query(sql, function (err, results) {
        if (err) { res.redirect("/error"); return }
        if (results.length == 0) { // if query empty
            sql = "SELECT rollnumber FROM student_account WHERE class='" + class_name + "' LIMIT 1"
            db.query(sql, function (err, results) {
                if (err) { res.redirect("/error"); return }
                if (results.length == 0) {
                    error = "Sorry, the system cannot find class " + class_name
                    res.render('add-user.ejs', { data: results, contest_id: contest_id, message: message, error: error, warning: warning, class_name: class_name, role: req.session.role, user: req.session.user })
                    return
                } else {
                    warning = "All student are in contest"
                    res.render('add-user.ejs', { data: [], contest_id: contest_id, message: message, error: error, warning: warning, class_name: class_name, role: req.session.role, user: req.session.user })
                    return
                }
            })
        } else {
            res.render('add-user.ejs', { data: results, contest_id: contest_id, message: message, error: error, warning: warning, class_name: class_name, role: req.session.role, user: req.session.user })
        }
    })

}
//---------------------------------add user----------------------------------
exports.add_user = function (req, res) {
    var userId = req.session.userId
    if (userId == null) {
        res.redirect("/login")
        return
    }
    if (req.method == "POST") {
        var post = req.body
        var list_rollnumber = post.list_rollnumber
        var contest_id = post.contest_id
        var class_name = post.class_name

        if (list_rollnumber != "") { // if has student in added list
            var sql = "SELECT contest_name FROM contest WHERE contest_id=" + contest_id
            db.query(sql, function (err, results) {
                if (err || results.length == 0) { res.redirect("/error"); return }
                var contest_name = results[0].contest_name
                var list = list_rollnumber.split(",")
                var sql = "UPDATE student_account SET contest_id=" + contest_id + " WHERE "
                for (let i = 0, l = list.length; i < l; ++i) {
                    // create a new folder contains submission files of student
                    if (!fs.existsSync(storage.BAILAM + contest_name + '/' + list[i])) {
                        fs.mkdirSync(storage.BAILAM + contest_name + '/' + list[i])
                    }
                    // update contest_id in student_account
                    sql += "rollnumber='" +list[i] + "' OR "
                }
                sql = sql.slice(0, -4)
                db.query(sql)
            })
            req.session.added = true
        }
        sleep(500).then(() => {
            res.redirect("/contest/load-user?class_name=" + class_name + "&contest_id=" + contest_id)
        })
    } else {
        res.redirect("/error")
        return
    }
}
//---------------------------------Load class----------------------------------
exports.load_class = function (req, res) {
    var userId = req.session.userId
    if (userId == null) {
        res.redirect("/login")
        return
    }
    try {
        //read file excel
        var class_name = req.query.class_name
        var workbook = XLSX.readFile(storage.EXCEL + class_name + '.xls')
        var sheet_name_list = workbook.SheetNames
        var xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]])
        if (typeof xlData[0].RollNumber === "undefined" || typeof xlData[0].MemberCode === "undefined" || typeof xlData[0].FullName === "undefined") {
            res.render('add-class.ejs', { data: [], xlData: "", message: "", error: "Invalid file excel", class_name: class_name, role: req.session.role, user: req.session.user })
        } else {
            if (req.session.sql_err) {
                req.session.sql_err = false
                res.render('add-class.ejs', { data: [], xlData: xlData, message: "", error: "Duplicate student roll number", class_name: class_name, role: req.session.role, user: req.session.user })
            } else {
                res.render('add-class.ejs', { data: [], xlData: xlData, message: "Load students successfully!", error: "", class_name: class_name, role: req.session.role, user: req.session.user })
            }
        }
    } catch (error) {
        console.log(error)
        res.redirect("/error")
        return
    }
}
//---------------------------------Add class----------------------------------
exports.add_class = function (req, res) {
    if (req.method == "POST") {
        var form = new formidable.IncomingForm()
        form.parse(req, function (err, fields, files) {
            if (err) { res.redirect("/error"); return }
            var class_name = fields.class_name
            if (files.filetoupload.name == "" || class_name == "") { // check file name is empty
                res.render('add-class.ejs', { data: [], xlData: "", message: "", error: "The input must be not empty!", class_name: class_name, role: req.session.role, user: req.session.user })
                return
            }
            // check class is exist
            var sql = "SELECT rollnumber FROM student_account WHERE class='" + class_name + "' LIMIT 1"
            db.query(sql, function (err, results) {
                if (err) { res.redirect("/error"); return }
                if (results.length > 0) { // if class is exist, return error
                    res.render('add-class.ejs', { data: [], xlData: "", message: "", error: "Sorry, class " + class_name + " is exist!", class_name: class_name, role: req.session.role, user: req.session.user })
                    return
                }
                // get file upload and rewrite it 
                var newfile = class_name + '.' + files.filetoupload.name.split('.')[1]
                var oldpath = files.filetoupload.path
                var newpath = storage.EXCEL + newfile
                fs.readFile(oldpath, function (err, data) {
                    if (err) { res.redirect("/error"); return }
                    // Write the file
                    fs.writeFile(newpath, data, function (err) {
                        if (err) { res.redirect("/error"); return }
                    })
                    // Delete the file
                    fs.unlink(oldpath, function (err) {
                        if (err) { res.redirect("/error"); return }
                    })
                    sleep(500).then(() => {
                        res.redirect("/contest/load-class?class_name=" + class_name)
                    })
                })
            })
        })
    } else {
        res.redirect("/error")
        return
    }
}
//-----------------------------------------------Create Class------------------------------------------------------
exports.create_class = function (req, res) {
    if (req.method == "POST") {
        var post = req.body
        var RollNumber = post.RollNumber.split(',')
        var MemberCode = post.MemberCode.split(',')
        var FullName = post.FullName.split(',')
        var class_name = post.class_name
        var sql = "INSERT INTO `student_account`(`rollnumber`, `username`, `password`, `name`, `class`) VALUES ";
        for (let i = 0; i < RollNumber.length; i++) {
            sql += "('" + RollNumber[i] + "','" + MemberCode[i] + "','" + MemberCode[i] + "','" + FullName[i] + "','" + class_name + "'),"
        }
        sql = sql.slice(0, -1)
        db.query(sql, function (err) {
            if (err) {
                req.session.sql_err = true
                res.redirect("/contest/load-class?class_name=" + class_name)
            } else {
                req.session.added = true
                res.redirect('/contest/add-class')
            }
        })

    } else {
        res.redirect("/error")
        return
    }
}
// get folder in Directories
function getFolders(srcpath) {
    try {
        return fs.readdirSync(srcpath)
            .map(file => path.join(srcpath, file))
            .filter(path => fs.statSync(path).isDirectory())
    } catch (error) {
    }
}
//---------------------------------add problem----------------------------------
exports.add_problem = function (req, res) {
    var userId = req.session.userId
    if (userId == null) {
        res.redirect("/login")
        return
    }
    var error = ""
    var message = ""
    if (req.session.upload_err) {
        req.session.upload_err = false
        error = "Upload error!"
    }
    if (req.session.upload_success) {
        req.session.upload_success = false
        message = "Upload successfully!"
    }
    var contest_id = req.query.contest_id
    var sql = "SELECT contest_name FROM contest WHERE contest_id=" + contest_id
    db.query(sql, function (err, results) {
        if (err || results.length == 0) {
            console.log(err)
            res.redirect("/error"); return
        }
        var contest_name = results[0].contest_name
        var problem_files = []
        // get problem
        fs.readdir(storage.DEBAI + contest_name, function (err, files) {
            if (err) { res.redirect("/error"); return }
            problem_files = files
            var testcase = []
            var testcase_size = []
            var testcase_path = []
            //get testcase
            var folders = getFolders(storage.TESTCASE + contest_name)
            for (let i = 0, l = folders.length; i < l; i++) {
                testcase.push(path.basename(folders[i])) // testcase name
                testcase_size.push(getFolders(folders[i]).length) // testcase size
                testcase_path.push(folders[i]) // testcase path
            }
            res.render('add-problem.ejs', { problem_files: problem_files, testcase: testcase, testcase_size: testcase_size, testcase_path: testcase_path, contest_id: contest_id, contest_name: contest_name, error: error, message: message, role: req.session.role, user: req.session.user })
        })

    })
}
//---------------------------------upload problem----------------------------------
exports.upload_problem = function (req, res) {
    if (req.session.role == "Student") {
        res.redirect("/error")
        return
    }
    if (req.method == "POST") {
        // upload problem to folder './public/debai/contest_name
        var form = new formidable.IncomingForm()
        form.maxFileSize = 5 * 1024 * 1024 // limit upload 5mb
        form.parse(req, function (err, fields, files) {
            var contest_id = fields.contest_id
            // check file is valid
            var type = files.filetoupload.name.substring(files.filetoupload.name.length - 4)
            if (err || files.filetoupload.name == "" || (type !== "docx" && type !== ".doc" && type !== ".pdf")) {
                req.session.upload_err = true
                res.redirect("/contest/add-problem?contest_id=" + contest_id)
                return
            }
            var contest_name = fields.contest_name
            var oldpath = files.filetoupload.path
            var newpath = storage.DEBAI + contest_name + '/' + files.filetoupload.name
            fs.readFile(oldpath, function (err, data) {
                if (err) { res.redirect("/error"); return }
                // Write the file
                fs.writeFile(newpath, data, function (err) {
                    if (err) { res.redirect("/error"); return }
                })
                // Delete the file
                fs.unlink(oldpath, function (err) {
                    if (err) { res.redirect("/error"); return }
                })
                sleep(500).then(() => {
                    req.session.upload_success = true
                    res.redirect("/contest/add-problem?contest_id=" + contest_id)
                })
            })

        })
    } else {
        res.redirect("/error")
        return
    }
}
//---------------------------------upload testcase----------------------------------
exports.upload_testcase = function (req, res) {
    if (req.session.role == "Student") {
        res.redirect("/error")
        return
    }
    if (req.method == "POST") {
        // upload testcase to folder './public/thm umuctest/' + contest_name
        var form = new formidable.IncomingForm()
        form.maxFileSize = 5 * 1024 * 1024 // limit upload 5mb
        form.parse(req, function (err, fields, files) {
            var contest_id = fields.contest_id
            // check file is valid
            if (err || files.filetoupload.name == "" || files.filetoupload.name.substring(files.filetoupload.name.length - 4) !== ".zip") {
                req.session.upload_err = true
                res.redirect("/contest/add-problem?contest_id=" + contest_id)
                return
            }
            var contest_name = fields.contest_name
            var oldpath = files.filetoupload.path
            var newpath = storage.TESTCASE + contest_name + '/' + files.filetoupload.name
            fs.readFile(oldpath, function (err, data) {
                if (err) { res.redirect("/error"); return }
                // Write the file
                fs.writeFile(newpath, data, function (err) {
                    if (err) { res.redirect("/error"); return }
                })
                // Delete the file
                fs.unlink(oldpath, function (err) {
                    if (err) { res.redirect("/error"); return }
                })
                try { // extract file .zip
                    extract(newpath, { dir: public_dir + storage.TESTCASE.substring(8) + contest_name })
                    sleep(1000).then(() => {
                        checkTestcase(newpath.substring(0, newpath.length - 4), req)
                        if (!req.session.upload_err) {
                            req.session.upload_success = true
                        }
                        res.redirect("/contest/add-problem?contest_id=" + contest_id)
                    })
                } catch (err) {
                    res.redirect("/error")
                    return
                }
            })

        })
    } else {
        res.redirect("/error")
        return
    }
}
// Check testcase is valid
function checkTestcase(dir, req) {
    var results = []
    try {
        var list = fs.readdirSync(dir)
        list.forEach(function (file) {
            file = dir + '/' + file
            var stat = fs.statSync(file)
            if (stat && stat.isDirectory()) {
                /* Recurse into a subdirectory */
                results = results.concat(checkTestcase(file))
            } else {
                /* Is a file */
                var type = file.substring(file.length - 4)
                if (type !== ".inp" && type !== ".out") {
                    req.session.upload_err = true
                    return
                }
            }
        })
    } catch (error) {
        req.session.upload_err = true
    }
}
//---------------------------------delete problem----------------------------------
exports.delete_problem = function (req, res) {
    if (req.session.role == "Student") {
        res.redirect("/error")
        return
    }
    if (req.method == "POST") {
        var post = req.body
        var problem_path = post.problem_path
        var contest_id = post.contest_id
        // delete problem
        fs.unlink(problem_path, (err) => {
            if (err) { res.redirect("/error"); return }
            sleep(1000).then(() => {
                res.redirect("/contest/add-problem?contest_id=" + contest_id)
            })
        })
    } else {
        res.redirect("/error")
        return
    }
}
//---------------------------------delete testcase----------------------------------
exports.delete_testcase = function (req, res) {
    if (req.session.role == "Student") {
        res.redirect("/error")
        return
    }
    if (req.method == "POST") {
        var post = req.body
        var testcase_path = post.testcase_path
        var contest_id = post.contest_id
        lignator.remove(testcase_path) //delete folder testcase
        sleep(1000).then(() => {
            res.redirect("/contest/add-problem?contest_id=" + contest_id)
        })
    } else {
        res.redirect("/error")
        return
    }
}
//---------------------------------rank----------------------------------
exports.rank = function (req, res) {
    var userId = req.session.userId
    if (userId == null) {
        res.redirect("/login")
        return
    }
    if (req.session.role == "Student") {
        res.redirect("/error")
        return
    }
    var teacher_rollnumber = req.session.teacher_rollnumber
    var sql = "SELECT contest_id, contest_name, time_begin, time_end FROM `contest` WHERE `teacher_rollnumber`='" + teacher_rollnumber + "' AND deleted=0"
    db.query(sql, function (err, results) {
        if (err || results.length == 0) { res.redirect("/error"); return }
        res.render('rank-time.ejs', { data: results, role: req.session.role, user: req.session.user })
    })
}
//---------------------------------data rank----------------------------------
exports.data_rank = function (req, res) {
    var userId = req.session.userId
    if (userId == null) {
        res.redirect("/login")
        return
    }
    var message = ""
    var contest_id = req.query.contest_id
    var sql = "SELECT rollnumber FROM student_account WHERE contest_id=" + contest_id + " LIMIT 1"
    db.query(sql, function (err, results) {
        if (err) { res.redirect("/error"); return }
        if (results.length == 0) { // if No student in contest
            message = "No student in contest"
            res.render('data-rank.ejs', { data: [], problem_files: [], message: message, role: req.session.role, user: req.session.user })
        } else {
            sql = "SELECT contest_name, contest_id, time_begin, time_end, DATE_FORMAT(time_begin, '%d-%m-%Y %H:%i:%s') as time_begin1, DATE_FORMAT(time_end, '%d-%m-%Y %H:%i:%s') as time_end1 FROM `contest` WHERE `contest_id`=" + contest_id
            db.query(sql, function (err, results) {
                if (err || results.length == 0) { res.redirect("/error"); return }
                var contest_name = results[0].contest_name //contest name
                var problem_files = []
                // get all problem in folder './public/debai/' + contest_name
                fs.readdir(storage.DEBAI + contest_name, function (err, files) {
                    if (err) { res.redirect("/error"); return }
                    problem_files = files
                    res.render('data-rank.ejs', { data: results, problem_files: problem_files, message: message, role: req.session.role, user: req.session.user })
                })
            })
        }
    })
}
//---------------------------------load rank -> json----------------------------------
exports.load_rank = function (req, res) {
    var contest_id = req.query.contest_id
    var sql = "SELECT student_account.id, student_account.rollnumber, student_account.name, student_account.class, contest.contest_id, contest.contest_name, contest.time_begin, contest.time_end FROM contest " +
        "INNER JOIN student_account ON student_account.contest_id=contest.contest_id " +
        "WHERE contest.contest_id=" + contest_id
    db.query(sql, function (err, results) {
        if (err || results.length == 0) { res.redirect("/error"); return }
        var contest_name = results[0].contest_name
        var problem_files = []
        // get all problem in folder './public/debai/' + contest_name
        fs.readdir(storage.DEBAI + contest_name, function (err, files) {
            if (err) { res.redirect("/error"); return }
            problem_files = files
            var log_files = []
            // get all judged Logs in folder './public/nopbai/Logs/' + contest_name
            fs.readdir(storage.NOPBAI + 'Logs/' + contest_name, function (err, files) {
                if (err) { res.redirect("/error"); return }
                log_files = files
                res.render('load-rank.ejs', { data: results, problem_files: problem_files, log_files: log_files, message: "", role: req.session.role, user: req.session.user })
            })
        })
    })
}
//---------------------------------rank detail----------------------------------
exports.detail_rank = function (req, res) {
    var userId = req.session.userId
    if (userId == null) {
        res.redirect("/login")
        return
    }
    var rollnumber = req.query.rollnumber
    var sql = "SELECT contest.contest_name, contest.contest_id FROM contest INNER JOIN student_account ON student_account.contest_id=contest.contest_id WHERE student_account.rollnumber='" + rollnumber + "'"
    db.query(sql, function (err, results) {
        if (err || results.length == 0) { res.redirect("/error"); return }
        var contest_name = results[0].contest_name
        var contest_id = results[0].contest_id
        // get all judged Logs in folder './public/nopbai/Logs/contest_name
        fs.readdir(storage.NOPBAI + 'Logs/' + contest_name, function (err, files) {
            if (err) { res.redirect("/error"); return }
            var log_files = []
            for (let i = 0, l = files.length; i < l; i++) {
                if (files[i].includes(rollnumber)) {
                    log_files.push(files[i])
                }
            }
            // get all submissions of students in folder './public/thumucbailam/contest_name/rollnumber
            var bailam = traverseDir(storage.BAILAM + contest_name + '/' + rollnumber)
            res.render('rank-detail.ejs', { bailam: bailam, contest_name: contest_name, contest_id: contest_id, rollnumber: rollnumber, log_files: log_files, message: "", role: req.session.role, user: req.session.user })
        })
    })

}

// traverse Directory
function traverseDir(dir) {
    var results = []
    var list = fs.readdirSync(dir)
    list.forEach(function (file) {
        file = dir + '/' + file
        var stat = fs.statSync(file)
        if (stat && stat.isDirectory()) {
            /* Recurse into a subdirectory */
            results = results.concat(traverseDir(file))
        } else {
            /* Is a file */
            results.push(file)
        }
    })
    return results
}
//---------------------------------submissions page----------------------------------
exports.submission = function (req, res) {
    var userId = req.session.userId
    if (userId == null) {
        res.redirect("/login")
        return
    }
    var message = ""
    if (req.session.submit_success) {
        req.session.submit_success = false;
        message = "Submit successfully!"
    }
    if (req.session.submit_error) {
        req.session.submit_error = false;
        message = "Submit error!"
    }
    var sql = "SELECT contest.contest_name, contest.time_begin, contest.time_end, student_account.rollnumber, DATE_FORMAT(time_begin, '%d-%m-%Y %H:%i:%s') as time_begin1, DATE_FORMAT(time_end, '%d-%m-%Y %H:%i:%s') as time_end1 FROM student_account " +
        "INNER JOIN contest ON student_account.contest_id=contest.contest_id " +
        "WHERE student_account.id=" + userId
    db.query(sql, function (err, results) {
        if (err) { res.redirect("/error"); return }
        if (results.length == 0) { // if student have no contests
            error = "You have no contests"
            res.render('submit.ejs', { error: error, role: req.session.role, user: req.session.user })
        } else {
            var contest_name = results[0].contest_name
            // get all problem in folder './public/debai/contest_name
            fs.readdir(storage.DEBAI + contest_name, function (err, files) {
                if (err) { res.redirect("/error"); return }
                var debai = files
                req.session.debai = [];
                for (let i = 0, l = debai.length; i < l; ++i) {
                    req.session.debai.push(debai[i].split('-')[0])
                }
                // get all submissions of student in folder './public/thumucbailam/contest_name/results[0].rollnumber
                var bailam = traverseDir(storage.BAILAM + contest_name + '/' + results[0].rollnumber)
                res.render('submit.ejs', { error: "", data: results, debai: debai, bailam: bailam, message: message, role: req.session.role, user: req.session.user })
            })
        }
    })
}
//---------------------------------Submit submissions file----------------------------------
exports.submit = function (req, res) {
    if (req.method == "POST") {
        var form = new formidable.IncomingForm()
        form.maxFileSize = 5 * 1024 * 1024 // limit upload 5mb
        form.parse(req, function (err, fields, files) {
            // check file is valid
            if (err || files.filetoupload.name == "" || !req.session.debai.includes(fields.tenbai) || !/^\w+\.(c|cpp)$/.test(files.filetoupload.name)) {
                req.session.submit_error = true
                res.redirect("/submission")
                return
            }
            // create new formatted name of uploaded file
            var type = files.filetoupload.name.split('.')
            var ip = ""
            if (req.session.ipaddress.includes(':')) {
                ip = req.session.ipaddress.replace(/:/g, '')
            } else if (req.session.ipaddress.includes('.')) {
                ip = req.session.ipaddress.replace(/./g, '_')
            }
            var newfile = '[' + ip + '][' + fields.time + '][' + fields.contest_name + '][' + fields.rollnumber + '][' + fields.tenbai + '].' + type[type.length - 1]
            var oldpath = files.filetoupload.path
            var newpath = storage.NOPBAI + newfile
            fs.readFile(oldpath, function (err, data) {
                if (err) { res.redirect("/error"); return }
                // Write the file
                fs.writeFile(newpath, data, function (err) {
                    if (err) { res.redirect("/error"); return }
                })
                // Delete the file
                fs.unlink(oldpath, function (err) {
                    if (err) { res.redirect("/error"); return }
                })
                sleep(500).then(() => {
                    req.session.submit_success = true
                    res.redirect("/submission")
                })
            })

        })
    } else {
        res.redirect("/error")
        return
    }
}
//---------------------------------Destroy session when closing tab or browser----------------------------------
exports.session_destroy = function (req, res) {
    if (req.session.role == "Student") {
        var sql = "UPDATE student_account SET `ip`='" + req.session.ipaddress + "',`timeout`='" + new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000) + minutes * 60000).toISOString().substring(0, 19) + "', `islogin`=0 WHERE `id`=" + req.session.userId
        db.query(sql)
    }
    console.log(req.session.user + " has disconected")
    req.session.destroy()
}